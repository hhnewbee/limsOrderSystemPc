-- Field Schema - Create Tables (camelCase)
-- 统一使用 camelCase 命名，与钉钉和代码保持一致
-- 
-- ⚠️ 先删除旧表再执行

-- ============================================
-- 删除旧表 (如果存在)
-- ============================================
DROP TABLE IF EXISTS multi_group_comparison;
DROP TABLE IF EXISTS pairwise_comparison;
DROP TABLE IF EXISTS sample_list;
DROP TABLE IF EXISTS orders;

-- ============================================
-- 订单主表
-- ============================================
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(255) UNIQUE NOT NULL,
    "formInstanceId" VARCHAR(255),
    
    -- 客户信息
    "customerUnit" VARCHAR(255),
    "customerName" VARCHAR(255),
    department VARCHAR(255),
    "departmentDirector" VARCHAR(255),
    "customerPhone" VARCHAR(50),
    "customerEmail" VARCHAR(255),
    
    -- 样品信息
    "serviceType" VARCHAR(255),
    "productLine" VARCHAR(255),
    "specialInstructions" TEXT,
    "speciesName" VARCHAR(255),
    "speciesLatinName" VARCHAR(255),
    "sampleType" VARCHAR(255),
    "sampleTypeDetail" TEXT,
    "detectionQuantity" INTEGER,
    "cellCount" INTEGER,
    "preservationMedium" VARCHAR(255),
    "samplePreprocessing" VARCHAR(255),
    "remainingSampleHandling" VARCHAR(255),
    "needBioinformaticsAnalysis" BOOLEAN,
    
    -- 运送信息
    "shippingMethod" VARCHAR(255),
    "expressCompanyWaybill" VARCHAR(255),
    "shippingTime" TIMESTAMP,
    
    -- 项目信息
    "projectNumber" VARCHAR(255),
    "productNo" VARCHAR(255),
    "unitPrice" DECIMAL(10,2),
    "otherExpenses" DECIMAL(10,2),
    "salesmanName" VARCHAR(255),
    "salesmanContact" VARCHAR(50),
    "technicalSupportName" VARCHAR(255),
    "projectType" VARCHAR(255),
    
    -- 状态
    status VARCHAR(50) DEFAULT 'draft',
    "tableStatus" VARCHAR(100),
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    "submittedAt" TIMESTAMP,
    
    -- 关联
    "userId" UUID REFERENCES auth.users(id),
    "salesDingtalkId" VARCHAR(255)
);

-- ============================================
-- 样本清单表
-- ============================================
CREATE TABLE sample_list (
    id SERIAL PRIMARY KEY,
    "orderId" INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    "orderUuid" VARCHAR(255) REFERENCES orders(uuid) ON DELETE CASCADE,
    "sequenceNo" INTEGER NOT NULL DEFAULT 0,
    "sampleName" VARCHAR(255),
    "analysisName" VARCHAR(255),
    "groupName" VARCHAR(255),
    "detectionOrStorage" VARCHAR(100),
    "sampleTubeCount" INTEGER,
    "experimentDescription" TEXT
);

-- ============================================
-- 两组比较表
-- ============================================
CREATE TABLE pairwise_comparison (
    id SERIAL PRIMARY KEY,
    "orderId" INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    "orderUuid" VARCHAR(255) REFERENCES orders(uuid) ON DELETE CASCADE,
    "sequenceNo" INTEGER NOT NULL DEFAULT 0,
    "treatmentGroup" VARCHAR(255),
    "controlGroup" VARCHAR(255),
    "comparisonScheme" VARCHAR(255)
);

-- ============================================
-- 多组比较表
-- ============================================
CREATE TABLE multi_group_comparison (
    id SERIAL PRIMARY KEY,
    "orderId" INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    "orderUuid" VARCHAR(255) REFERENCES orders(uuid) ON DELETE CASCADE,
    "sequenceNo" INTEGER NOT NULL DEFAULT 0,
    "comparisonGroups" JSONB
);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX idx_orders_uuid ON orders(uuid);
CREATE INDEX idx_orders_userId ON orders("userId");
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_sample_list_orderUuid ON sample_list("orderUuid");
CREATE INDEX idx_pairwise_orderUuid ON pairwise_comparison("orderUuid");
CREATE INDEX idx_multigroup_orderUuid ON multi_group_comparison("orderUuid");
