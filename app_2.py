from flask import Flask, jsonify, request, make_response
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from functools import wraps
from sqlalchemy import func
from flask_cors import CORS
from datetime import timezone, timedelta

# 创建北京时间时区（UTC+8）
beijing_tz = timezone(timedelta(hours=8))

def to_beijing_time(utc_time):
    if utc_time is None:
        return None
    # 将naive UTC时间标记为UTC时区
    utc_time = utc_time.replace(tzinfo=timezone.utc)
    # 转换为北京时间
    return utc_time.astimezone(beijing_tz)

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:mysql@yyhzy/campus_bike_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key'

print("数据库URI:", app.config.get('SQLALCHEMY_DATABASE_URI', '未设置!'))


CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
db = SQLAlchemy(app)

# 认证装饰器
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == "OPTIONS":  # 放行 OPTIONS 请求
            return jsonify({"message": "OK"}), 200

        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': '缺少访问令牌'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = db.session.get(User,data['user_id'])
            print(f"Received token: {token}")
            print(f"Decoded data: {data}")
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "令牌已过期"}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': '无效的访问令牌'}), 401

        return f(current_user, *args, **kwargs)

    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.role != 'admin':
            return jsonify({'message': '需要管理员权限'}), 403
        return f(current_user, *args, **kwargs)

    return decorated



# 数据库模型
class User(db.Model):
    __tablename__ = 'User'
    user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('admin', 'user'), default='user', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Location(db.Model):
    __tablename__ = 'Location'
    name = db.Column(db.String(100), primary_key=True)
    latitude = db.Column(db.Numeric(9, 6), nullable=False)
    longitude = db.Column(db.Numeric(9, 6), nullable=False)


class Bicycle(db.Model):
    __tablename__ = 'Bicycle'
    frame_no = db.Column(db.String(20), primary_key=True)
    brand = db.Column(db.String(50), nullable=False)
    color = db.Column(db.String(20), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey('User.user_id'), nullable=False)
    current_location = db.Column(db.String(100), db.ForeignKey('Location.name'))
    status = db.Column(db.Enum('available', 'in_use'), default='available')  # 添加状态字段

    owner = db.relationship('User', backref='bicycles')
    location = db.relationship('Location')


class RideRecord(db.Model):
    __tablename__ = 'RideRecord'
    record_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    start_time = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    end_time = db.Column(db.DateTime)
    user_id = db.Column(db.Integer, db.ForeignKey('User.user_id'), nullable=False)
    bicycle_id = db.Column(db.String(20), db.ForeignKey('Bicycle.frame_no'), nullable=False)
    start_place = db.Column(db.String(100), db.ForeignKey('Location.name'), nullable=False)
    end_place = db.Column(db.String(100), db.ForeignKey('Location.name'))

    user = db.relationship('User', backref='ride_records')
    bicycle = db.relationship('Bicycle')
    start_location = db.relationship('Location', foreign_keys=[start_place])
    end_location = db.relationship('Location', foreign_keys=[end_place])





# 用户认证
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data['username']).first()

    if not user or not user.check_password(data['password']):
        return jsonify({'message': '用户名或密码错误'}), 401

    token = jwt.encode({
        'user_id': user.user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, app.config['SECRET_KEY'])

    return jsonify({
        'user_id': user.user_id,
        'username': user.username,
        'role': user.role,
        'token': token
    })


@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': '用户名已存在'}), 400

    new_user = User(username=data['username'], role='user')
    new_user.set_password(data['password'])

    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': '用户注册成功'}), 201


# 用户功能 - 添加自行车
@app.route('/my/bicycles', methods=['POST'])
@token_required
def add_my_bicycle(current_user):
    data = request.get_json()

    # 验证必要字段
    required_fields = ['frame_no', 'brand', 'color']
    if not all(field in data for field in required_fields):
        return jsonify({'message': '缺少必要字段：车架号、品牌或颜色'}), 400

    # 检查车架号是否已存在
    if Bicycle.query.get(data['frame_no']):
        return jsonify({'message': '车架号已存在'}), 400

    # 创建自行车对象
    new_bicycle = Bicycle(
        frame_no=data['frame_no'],
        brand=data['brand'],
        color=data['color'],
        owner_id=current_user.user_id,
        status='available'
    )

    # 设置位置（如果提供）
    if 'current_location' in data:
        location = Location.query.get(data['current_location'])
        if not location:
            return jsonify({'message': '指定位置不存在'}), 404
        new_bicycle.current_location = data['current_location']

    db.session.add(new_bicycle)
    db.session.commit()

    return jsonify({
        'message': '自行车添加成功',
        'frame_no': new_bicycle.frame_no
    }), 201


# 用户功能 - 获取我的自行车
@app.route('/my/bicycles', methods=['GET'])
@token_required
def get_my_bicycles(current_user):
    bicycles = Bicycle.query.filter_by(owner_id=current_user.user_id).all()
    return jsonify([{
        'frame_no': b.frame_no,
        'brand': b.brand,
        'color': b.color,
        'status': b.status,
        'current_location': b.current_location if b.location else None,
        'location_coords': {
            'latitude': float(b.location.latitude),
            'longitude': float(b.location.longitude)
        } if b.location else None
    } for b in bicycles])


# 用户功能 - 删除我的自行车
@app.route('/my/bicycles/<frame_no>', methods=['DELETE'])
@token_required
def delete_my_bicycle(current_user, frame_no):
    bicycle = Bicycle.query.get(frame_no)

    # 检查自行车是否存在
    if not bicycle:
        return jsonify({'message': '自行车不存在'}), 404

    # 验证自行车所有权
    if bicycle.owner_id != current_user.user_id:
        return jsonify({'message': '无权删除他人的自行车'}), 403

    # 检查是否有未结束的骑行记录
    ongoing_ride = RideRecord.query.filter_by(
        bicycle_id=frame_no,
        end_time=None
    ).first()

    if ongoing_ride:
        return jsonify({'message': '此自行车有未结束的骑行记录，无法删除'}), 400

    db.session.delete(bicycle)
    db.session.commit()

    return jsonify({'message': '自行车删除成功'})


@app.route('/my/ride-records', methods=['GET'])
@token_required
def get_my_ride_records(current_user):
    records = RideRecord.query.filter_by(user_id=current_user.user_id).all()
    return jsonify([{
        'record_id': r.record_id,
        'start_time': to_beijing_time(r.start_time).isoformat(),
        'end_time': to_beijing_time(r.end_time).isoformat() if r.end_time else None,
        'bicycle_id': r.bicycle_id,
        'start_place': r.start_location.name,
        'end_place': r.end_location.name if r.end_location else None,
        'start_coords': {
            'latitude': float(r.start_location.latitude),
            'longitude': float(r.start_location.longitude)
        },
        'end_coords': {
            'latitude': float(r.end_location.latitude),
            'longitude': float(r.end_location.longitude)
        } if r.end_location else None
    } for r in records])


# 位置信息
@app.route('/locations', methods=['GET'])
def get_locations():
    locations = Location.query.all()
    return jsonify([{
        'name': loc.name,
        'latitude': float(loc.latitude),
        'longitude': float(loc.longitude)
    } for loc in locations])


# 骑行功能
@app.route('/ride/start', methods=['POST'])
@token_required
def start_ride(current_user):
    data = request.get_json()
    bicycle_id = data.get('bicycle_id')
    start_place = data.get('start_place')

    if not bicycle_id or not start_place:
        return jsonify({'message': '需要提供自行车ID和起始位置'}), 400

    # 检查自行车是否存在且可用
    bicycle = Bicycle.query.get(bicycle_id)
    if not bicycle:
        return jsonify({'message': '自行车不存在'}), 404
    if bicycle.status != 'available':
        return jsonify({'message': '自行车当前不可用'}), 400

    # 检查位置是否存在
    location = Location.query.get(start_place)
    if not location:
        return jsonify({'message': '起始位置不存在'}), 404

    # 创建骑行记录
    new_ride = RideRecord(
        user_id=current_user.user_id,
        bicycle_id=bicycle_id,
        start_place=start_place
    )

    # 更新自行车状态
    bicycle.status = 'in_use'
    bicycle.current_location = None

    db.session.add(new_ride)
    db.session.commit()

    return jsonify({
        'message': '骑行开始',
        'record_id': new_ride.record_id,
        'start_time': to_beijing_time(new_ride.start_time).isoformat()
    }), 201

@app.route("/admin/users", methods=["GET", "POST","OPTIONS"])
@token_required
@admin_required
def handle_admin_users(current_user):
    if request.method == "GET":
        users = User.query.all()
        return jsonify([{
            'user_id': b.user_id,
            'username': b.username,
            'role': b.role,
            'create_at': to_beijing_time(b.created_at).isoformat()

        } for b in users])

    elif request.method == "POST":
        data = request.get_json()
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'message': '用户名已存在'}), 400

        new_user = User(username=data['username'], role=data.get('role', 'user'))
        new_user.set_password(data['password'])
        db.session.add(new_user)
        db.session.commit()
        return jsonify({'message': '用户创建成功'}), 201

    # 默认返回（理论上不会执行到这里）
    return jsonify({'message': '方法不允许'}), 405


@app.route('/admin/users/<int:user_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_user(current_user, user_id):
    # 检查是否尝试删除自己
    if current_user.user_id == user_id:
        return jsonify({'message': '不能删除当前登录的管理员账户'}), 400

    # 获取要删除的用户
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': '用户不存在'}), 404

    # 检查用户是否有未结束的骑行记录
    ongoing_ride = RideRecord.query.filter_by(
        user_id=user_id,
        end_time=None
    ).first()

    if ongoing_ride:
        return jsonify({'message': '用户有未结束的骑行记录，无法删除'}), 400

    # 检查用户是否拥有自行车
    user_bicycles = Bicycle.query.filter_by(owner_id=user_id).all()
    if user_bicycles:
        # 检查自行车是否在使用中
        for bicycle in user_bicycles:
            if bicycle.status == 'in_use':
                return jsonify({'message': '用户有正在使用的自行车，无法删除'}), 400

    # 删除用户的自行车
    for bicycle in user_bicycles:
        db.session.delete(bicycle)

    # 删除用户的骑行记录
    RideRecord.query.filter_by(user_id=user_id).delete()

    # 删除用户
    db.session.delete(user)
    db.session.commit()

    return jsonify({'message': '用户删除成功'})

@app.route('/ride/end', methods=['POST'])
@token_required
def end_ride(current_user):
    data = request.get_json()
    record_id = data.get('record_id')
    end_place = data.get('end_place')

    if not record_id or not end_place:
        return jsonify({'message': '需要提供记录ID和结束位置'}), 400

    # 检查骑行记录是否存在
    ride = RideRecord.query.get(record_id)
    if not ride:
        return jsonify({'message': '骑行记录不存在'}), 404
    if ride.user_id != current_user.user_id:
        return jsonify({'message': '无权操作此记录'}), 403
    if ride.end_time:
        return jsonify({'message': '此骑行已结束'}), 400

    # 检查位置是否存在
    location = Location.query.get(end_place)
    if not location:
        return jsonify({'message': '结束位置不存在'}), 404

    # 结束骑行
    ride.end_time = datetime.datetime.utcnow()
    ride.end_place = end_place

    # 更新自行车状态和位置
    bicycle = Bicycle.query.get(ride.bicycle_id)
    bicycle.status = 'available'
    bicycle.current_location = end_place

    db.session.commit()

    return jsonify({
        'message': '骑行结束',
        'record_id': ride.record_id,
        'end_time': to_beijing_time(ride.end_time).isoformat()
    })


# 管理员功能
@app.route('/admin/bicycles', methods=['GET'])
@token_required
@admin_required
def get_all_bicycles(current_user):
    bicycles = Bicycle.query.all()
    return jsonify([{
        'frame_no': b.frame_no,
        'brand': b.brand,
        'color': b.color,
        'status': b.status,
        'owner_id': b.owner_id,
        'owner_username': b.owner.username,
        'current_location': b.location.name if b.location else None
    } for b in bicycles])


@app.route('/admin/bicycles/<frame_no>', methods=['PUT'])
@token_required
@admin_required
def update_bicycle(current_user, frame_no):
    bicycle = Bicycle.query.get(frame_no)
    if not bicycle:
        return jsonify({'message': '自行车不存在'}), 404

    data = request.get_json()
    if 'brand' in data:
        bicycle.brand = data['brand']
    if 'color' in data:
        bicycle.color = data['color']
    if 'current_location' in data:
        # 检查位置是否存在
        location = Location.query.get(data['current_location'])
        if not location:
            return jsonify({'message': '位置不存在'}), 404
        bicycle.current_location = data['current_location']
    if 'status' in data:
        bicycle.status = data['status']

    db.session.commit()
    return jsonify({'message': '自行车信息更新成功'})


@app.route('/admin/bicycles/<frame_no>', methods=['DELETE'])
@token_required
@admin_required
def delete_bicycle(current_user, frame_no):
    bicycle = Bicycle.query.get(frame_no)
    if not bicycle:
        return jsonify({'message': '自行车不存在'}), 404

    # 检查是否有未结束的骑行记录
    ongoing_ride = RideRecord.query.filter_by(
        bicycle_id=frame_no,
        end_time=None
    ).first()

    if ongoing_ride:
        return jsonify({'message': '此自行车有未结束的骑行记录，无法删除'}), 400

    db.session.delete(bicycle)
    db.session.commit()
    return jsonify({'message': '自行车删除成功'})


@app.route('/admin/ride-records', methods=['GET'])
@token_required
@admin_required
def get_all_ride_records(current_user):
    records = RideRecord.query.all()
    return jsonify([{
        'record_id': r.record_id,
        'user_id': r.user_id,
        'username': r.user.username,
        'bicycle_id': r.bicycle_id,
        'start_time': to_beijing_time(r.start_time).isoformat(),
        'end_time': to_beijing_time(r.end_time).isoformat() if r.end_time else None,
        'start_place': r.start_location.name,
        'end_place': r.end_location.name if r.end_location else None
    } for r in records])


@app.route('/admin/ride-records/<int:record_id>', methods=['PUT'])
@token_required
@admin_required
def update_ride_record(current_user, record_id):
    ride = RideRecord.query.get(record_id)
    if not ride:
        return jsonify({'message': '骑行记录不存在'}), 404

    data = request.get_json()
    if 'user_id' in data:
        # 检查用户是否存在
        user = User.query.get(data['user_id'])
        if not user:
            return jsonify({'message': '用户不存在'}), 404
        ride.user_id = data['user_id']

    if 'bicycle_id' in data:
        # 检查自行车是否存在
        bicycle = Bicycle.query.get(data['bicycle_id'])
        if not bicycle:
            return jsonify({'message': '自行车不存在'}), 404
        ride.bicycle_id = data['bicycle_id']

    if 'start_time' in data:
        ride.start_time = datetime.datetime.fromisoformat(data['start_time'])

    if 'end_time' in data:
        ride.end_time = datetime.datetime.fromisoformat(data['end_time']) if data['end_time'] else None

    if 'start_place' in data:
        # 检查位置是否存在
        location = Location.query.get(data['start_place'])
        if not location:
            return jsonify({'message': '起始位置不存在'}), 404
        ride.start_place = data['start_place']

    if 'end_place' in data:
        if data['end_place']:
            # 检查位置是否存在
            location = Location.query.get(data['end_place'])
            if not location:
                return jsonify({'message': '结束位置不存在'}), 404
        ride.end_place = data['end_place']

    db.session.commit()
    return jsonify({'message': '骑行记录更新成功'})


@app.route('/admin/ride-records/<int:record_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_ride_record(current_user, record_id):
    ride = RideRecord.query.get(record_id)
    if not ride:
        return jsonify({'message': '骑行记录不存在'}), 404

    db.session.delete(ride)
    db.session.commit()
    return jsonify({'message': '骑行记录删除成功'})


@app.route('/admin/location', methods=['POST'])
@token_required
@admin_required
def add_location(current_user):
    data = request.get_json()
    if Location.query.get(data['name']):
        return jsonify({'message': '地点已存在'}), 400

    new_location = Location(
        name=data['name'],
        latitude=data['latitude'],
        longitude=data['longitude']
    )

    db.session.add(new_location)
    db.session.commit()

    return jsonify({'message': '地点添加成功'}), 201


@app.route('/admin/location/<name>', methods=['PUT'])
@token_required
@admin_required
def update_location(current_user, name):
    location = Location.query.get(name)
    if not location:
        return jsonify({'message': '地点不存在'}), 404

    data = request.get_json()
    if 'latitude' in data:
        location.latitude = data['latitude']
    if 'longitude' in data:
        location.longitude = data['longitude']

    db.session.commit()
    return jsonify({'message': '地点信息更新成功'})


@app.route('/admin/location/<name>', methods=['DELETE'])
@token_required
@admin_required
def delete_location(current_user, name):
    location = Location.query.get(name)
    if not location:
        return jsonify({'message': '地点不存在'}), 404

    # 检查是否有自行车或骑行记录使用此位置
    bicycles = Bicycle.query.filter_by(current_location=name).count()
    start_rides = RideRecord.query.filter_by(start_place=name).count()
    end_rides = RideRecord.query.filter_by(end_place=name).count()

    if bicycles > 0 or start_rides > 0 or end_rides > 0:
        return jsonify({'message': '此位置正在使用中，无法删除'}), 400

    db.session.delete(location)
    db.session.commit()
    return jsonify({'message': '地点删除成功'})


# 初始化数据库函数
def initialize_database():
    with app.app_context():
        db.create_all()
        # 创建初始管理员账号（仅第一次运行时）
        if not User.query.filter_by(username='admin').first():
            admin = User(username='admin', role='admin')
            admin.set_password('adminpassword')
            db.session.add(admin)

            # 创建初始位置
            main_gate = Location(name='校大门', latitude=30.123456, longitude=120.654321)
            library = Location(name='图书馆', latitude=30.123567, longitude=120.654567)
            db.session.add(main_gate)
            db.session.add(library)

            db.session.commit()


# 在应用启动时调用初始化函数
if __name__ == '__main__':
    initialize_database()
    app.run(debug=True)