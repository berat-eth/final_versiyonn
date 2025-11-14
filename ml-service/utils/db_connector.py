import pymysql
import pymysql.cursors
import logging
from typing import Optional, List, Dict, Any
import asyncio
from contextlib import contextmanager
import threading

logger = logging.getLogger(__name__)

class DBConnector:
    def __init__(self, host: str, port: int, user: str, password: str, database: str, pool_size: int = 5):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.database = database
        self.pool_size = pool_size
        self.pool = []
        self.pool_lock = threading.Lock()
        self._create_pool()
    
    def _create_pool(self):
        """Create connection pool"""
        self.pool = []
        for _ in range(self.pool_size):
            try:
                conn = pymysql.connect(
                    host=self.host,
                    port=self.port,
                    user=self.user,
                    password=self.password,
                    database=self.database,
                    charset='utf8mb4',
                    cursorclass=pymysql.cursors.DictCursor,
                    autocommit=False
                )
                self.pool.append(conn)
            except Exception as e:
                logger.error(f"Error creating connection in pool: {e}")
                raise
    
    def _get_connection(self):
        """Get connection from pool"""
        with self.pool_lock:
            if self.pool:
                return self.pool.pop()
            # If pool is empty, create a new connection
            return pymysql.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.database,
                charset='utf8mb4',
                cursorclass=pymysql.cursors.DictCursor,
                autocommit=False
            )
    
    def _return_connection(self, conn):
        """Return connection to pool"""
        with self.pool_lock:
            if len(self.pool) < self.pool_size:
                self.pool.append(conn)
            else:
                conn.close()
    
    async def connect(self):
        """Create database connection pool"""
        try:
            # Test connection
            test_conn = self._get_connection()
            test_conn.ping()
            self._return_connection(test_conn)
            logger.info(f"✅ Database connected (pool size: {self.pool_size})")
        except Exception as e:
            logger.error(f"❌ Database connection error: {e}")
            raise
    
    async def close(self):
        """Close database connection pool"""
        with self.pool_lock:
            for conn in self.pool:
                try:
                    conn.close()
                except:
                    pass
            self.pool = []
        logger.info("Database connection pool closed")
    
    async def ping(self) -> bool:
        """Check database connection"""
        try:
            conn = self._get_connection()
            try:
                conn.ping()
                return True
            finally:
                self._return_connection(conn)
        except:
            return False
    
    def _execute(self, query: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
        """Execute query synchronously (will be run in thread pool)"""
        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(query, params or ())
                if query.strip().upper().startswith('SELECT'):
                    result = cursor.fetchall()
                    return result
                else:
                    conn.commit()
                    return []
        except Exception as e:
            conn.rollback()
            logger.error(f"Database query error: {e}")
            raise
        finally:
            self._return_connection(conn)
    
    async def execute(self, query: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
        """Execute query asynchronously"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._execute, query, params)
    
    async def execute_many(self, query: str, params_list: List[tuple]) -> int:
        """Execute many queries"""
        try:
            loop = asyncio.get_event_loop()
            def _execute_many():
                with self.pool.cursor() as cursor:
                    affected = cursor.executemany(query, params_list)
                    self.pool.commit()
                    return affected
            return await loop.run_in_executor(None, _execute_many)
        except Exception as e:
            self.pool.rollback()
            logger.error(f"Database executemany error: {e}")
            raise
    
    async def insert_predictions(self, predictions: List[Dict[str, Any]]):
        """Insert predictions batch"""
        if not predictions:
            return
        
        query = """
            INSERT INTO ml_predictions 
            (userId, tenantId, predictionType, probability, metadata, createdAt)
            VALUES (%s, %s, %s, %s, %s, NOW())
        """
        params = [
            (
                p['userId'],
                p.get('tenantId', 1),
                p['predictionType'],
                p['probability'],
                p.get('metadata', '{}')
            )
            for p in predictions
        ]
        await self.execute_many(query, params)
    
    async def insert_recommendations(self, recommendations: List[Dict[str, Any]]):
        """Insert recommendations batch"""
        if not recommendations:
            return
        
        query = """
            INSERT INTO ml_recommendations 
            (userId, tenantId, productIds, scores, metadata, createdAt)
            VALUES (%s, %s, %s, %s, %s, NOW())
        """
        params = [
            (
                r['userId'],
                r.get('tenantId', 1),
                ','.join(map(str, r['productIds'])),
                ','.join(map(str, r['scores'])),
                r.get('metadata', '{}')
            )
            for r in recommendations
        ]
        await self.execute_many(query, params)
    
    async def insert_anomalies(self, anomalies: List[Dict[str, Any]]):
        """Insert anomalies batch"""
        if not anomalies:
            return
        
        query = """
            INSERT INTO ml_anomalies 
            (eventId, userId, tenantId, anomalyScore, anomalyType, metadata, createdAt)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """
        params = [
            (
                a['eventId'],
                a.get('userId'),
                a.get('tenantId', 1),
                a['anomalyScore'],
                a['anomalyType'],
                a.get('metadata', '{}')
            )
            for a in anomalies
        ]
        await self.execute_many(query, params)
    
    async def insert_segments(self, segments: List[Dict[str, Any]]):
        """Insert/update segments batch"""
        if not segments:
            return
        
        query = """
            INSERT INTO ml_segments 
            (userId, tenantId, segmentId, segmentName, confidence, metadata, updatedAt)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            ON DUPLICATE KEY UPDATE
                segmentId = VALUES(segmentId),
                segmentName = VALUES(segmentName),
                confidence = VALUES(confidence),
                metadata = VALUES(metadata),
                updatedAt = NOW()
        """
        params = [
            (
                s['userId'],
                s.get('tenantId', 1),
                s['segmentId'],
                s['segmentName'],
                s['confidence'],
                s.get('metadata', '{}')
            )
            for s in segments
        ]
        await self.execute_many(query, params)

