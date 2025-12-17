import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lims_client',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;

// 初始化数据库表
export async function initDatabase() {
  const connection = await pool.getConnection();
  try {
    // 订单主表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(64) UNIQUE NOT NULL COMMENT '唯一标识码',
        form_instance_id VARCHAR(128) COMMENT '钉钉宜搭表单实例ID',
        
        -- 客户信息
        customer_unit VARCHAR(255) COMMENT '客户单位名称',
        customer_name VARCHAR(100) COMMENT '客户姓名',
        department VARCHAR(255) COMMENT '部门/科室/院系',
        department_director VARCHAR(100) COMMENT '科室主任/PI',
        customer_phone VARCHAR(20) COMMENT '客户手机',
        customer_email VARCHAR(100) COMMENT '客户邮箱',
        
        -- 样品信息
        service_type VARCHAR(255) COMMENT '服务种类',
        product_line VARCHAR(255) COMMENT '产品线',
        special_instructions TEXT COMMENT '特殊说明',
        species_name VARCHAR(255) COMMENT '物种名称',
        species_latin_name VARCHAR(255) COMMENT '物种拉丁名',
        sample_type VARCHAR(100) COMMENT '样本类型',
        sample_type_detail TEXT COMMENT '样本类型详述',
        detection_quantity INT COMMENT '检测数量',
        cell_count INT COMMENT '细胞数',
        preservation_medium VARCHAR(100) COMMENT '保存介质',
        sample_preprocessing VARCHAR(255) COMMENT '样本前处理方式',
        remaining_sample_handling VARCHAR(255) COMMENT '剩余样品处理方式',
        need_bioinformatics_analysis TINYINT(1) DEFAULT 0 COMMENT '是否需要生信分析',
        
        -- 样品运送
        shipping_method VARCHAR(50) COMMENT '运送方式',
        express_company_waybill VARCHAR(255) COMMENT '快递公司及运单号',
        shipping_time DATETIME COMMENT '送样时间',
        
        -- 项目信息
        project_number VARCHAR(100) COMMENT '项目编号',
        unit_price DECIMAL(10,2) COMMENT '检测服务费单价',
        other_expenses DECIMAL(10,2) COMMENT '其它费用',
        salesman_name VARCHAR(100) COMMENT '业务员姓名',
        salesman_contact VARCHAR(100) COMMENT '业务员联系方式',
        technical_support_name VARCHAR(100) COMMENT '技术支持姓名',
        project_type VARCHAR(100) COMMENT '项目类型',
        
        -- 状态
        status ENUM('draft', 'submitted') DEFAULT 'draft' COMMENT '本地状态',
        table_status VARCHAR(100) COMMENT '钉钉表单状态（如：客户编辑中、客户已提交、客户修改中等）',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        submitted_at TIMESTAMP NULL COMMENT '提交时间',
        
        INDEX idx_uuid (uuid),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 样本清单表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sample_list (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL COMMENT '订单ID',
        sequence_no INT NOT NULL COMMENT '序号',
        sample_name VARCHAR(50) NOT NULL COMMENT '样本名称',
        analysis_name VARCHAR(50) COMMENT '分析名称',
        group_name VARCHAR(50) COMMENT '分组名称',
        detection_or_storage ENUM('检测', '暂存') NOT NULL COMMENT '检测或暂存',
        sample_tube_count INT NOT NULL COMMENT '样品管数',
        experiment_description TEXT COMMENT '实验设计描述及样本备注',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_order_id (order_id),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 两两比较表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS pairwise_comparison (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL COMMENT '订单ID',
        sequence_no INT NOT NULL COMMENT '序号',
        treatment_group VARCHAR(50) NOT NULL COMMENT '处理组（分子样本）',
        control_group VARCHAR(50) NOT NULL COMMENT '对照组（分母样本）',
        comparison_scheme VARCHAR(100) COMMENT '比较组方案',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_order_id (order_id),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 多组比较表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS multi_group_comparison (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL COMMENT '订单ID',
        sequence_no INT NOT NULL COMMENT '序号',
        comparison_groups JSON NOT NULL COMMENT '差异分析比较组',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_order_id (order_id),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('Database tables initialized successfully');
  } finally {
    connection.release();
  }
}

