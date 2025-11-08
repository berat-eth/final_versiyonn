import pymysql
import pymysql.cursors
import logging
from typing import Optional, List, Dict, Any
import asyncio
from contextlib import contextmanager

logger = logging.getLogger(__name__)

class DBConnector:
    def __init__(self, host: str, port: int, user: str, password: str, database: str):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.database = database
        self.pool = None
    
    async def connect(self):
        """Create database connection pool"""
        try:
            # pymysql is synchronous, so we'll use it in thread pool
            self.pool = pymysql.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.database,
                charset='utf8mb4',
                cursorclass=pymysql.cursors.DictCursor,
                autocommit=False
            )
            logger.info("✅ Database connected")
        except Exception as e:
            logger.error(f"❌ Database connection error: {e}")
            raise
    
    async def close(self):
        """Close database connection"""
        if self.pool:
            self.pool.close()
            logger.info("Database connection closed")
    
    async def ping(self) -> bool:
        """Check database connection"""
        try:
            if self.pool:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, self.pool.ping, True)
                return True
            return False
        except:
            return False
    
    def _execute(self, query: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
        """Execute query synchronously (will be run in thread pool)"""
        try:
            with self.pool.cursor() as cursor:
                cursor.execute(query, params or ())
                if query.strip().upper().startswith('SELECT'):
                    return cursor.fetchall()
                else:
                    self.pool.commit()
                    return []
        except Exception as e:
            self.pool.rollback()
            logger.error(f"Database query error: {e}")
            raise
    
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

