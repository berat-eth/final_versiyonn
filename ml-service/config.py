import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Database
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 3306))
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME', 'huglu_outdoor')
    
    # Redis
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
    REDIS_QUEUE_NAME = os.getenv('REDIS_QUEUE_NAME', 'ml:events')
    
    # ML Service
    ML_SERVICE_HOST = os.getenv('ML_SERVICE_HOST', '0.0.0.0')
    ML_SERVICE_PORT = int(os.getenv('ML_SERVICE_PORT', 8001))
    
    # Model Storage
    MODEL_STORAGE_PATH = os.getenv('MODEL_STORAGE_PATH', './saved_models')
    
    # Training
    BATCH_SIZE = int(os.getenv('BATCH_SIZE', 32))
    EPOCHS = int(os.getenv('EPOCHS', 50))
    LEARNING_RATE = float(os.getenv('LEARNING_RATE', 0.001))
    
    # Real-time Processing
    EVENT_BATCH_SIZE = int(os.getenv('EVENT_BATCH_SIZE', 100))
    PROCESSING_INTERVAL = int(os.getenv('PROCESSING_INTERVAL', 5))  # seconds
    
    # Model Settings
    USE_TENSORFLOW = os.getenv('USE_TENSORFLOW', 'true').lower() == 'true'
    USE_PYTORCH = os.getenv('USE_PYTORCH', 'false').lower() == 'true'
    
    # Feature Engineering
    SEQUENCE_LENGTH = int(os.getenv('SEQUENCE_LENGTH', 20))
    EMBEDDING_DIM = int(os.getenv('EMBEDDING_DIM', 64))
    
    # Anomaly Detection
    ANOMALY_THRESHOLD = float(os.getenv('ANOMALY_THRESHOLD', 0.7))
    
    # Segmentation
    NUM_SEGMENTS = int(os.getenv('NUM_SEGMENTS', 5))
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

config = Config()

