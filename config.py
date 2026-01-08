import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-very-secret-key-12345'
    SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:123456@localhost/campus_bike_db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False