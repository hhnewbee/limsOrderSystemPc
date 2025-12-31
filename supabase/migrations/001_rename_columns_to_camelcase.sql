-- Field Schema Centralization Migration
-- Rename all columns from snake_case to camelCase
-- 
-- ⚠️ IMPORTANT: Execute during low-traffic period
-- ⚠️ BACKUP DATABASE BEFORE EXECUTING

-- ============================================
-- Orders Table
-- ============================================
ALTER TABLE orders RENAME COLUMN form_instance_id TO "formInstanceId";
ALTER TABLE orders RENAME COLUMN customer_unit TO "customerUnit";
ALTER TABLE orders RENAME COLUMN customer_name TO "customerName";
ALTER TABLE orders RENAME COLUMN department TO "department";
ALTER TABLE orders RENAME COLUMN department_director TO "departmentDirector";
ALTER TABLE orders RENAME COLUMN customer_phone TO "customerPhone";
ALTER TABLE orders RENAME COLUMN customer_email TO "customerEmail";
ALTER TABLE orders RENAME COLUMN service_type TO "serviceType";
ALTER TABLE orders RENAME COLUMN product_line TO "productLine";
ALTER TABLE orders RENAME COLUMN special_instructions TO "specialInstructions";
ALTER TABLE orders RENAME COLUMN species_name TO "speciesName";
ALTER TABLE orders RENAME COLUMN species_latin_name TO "speciesLatinName";
ALTER TABLE orders RENAME COLUMN sample_type TO "sampleType";
ALTER TABLE orders RENAME COLUMN sample_type_detail TO "sampleTypeDetail";
ALTER TABLE orders RENAME COLUMN detection_quantity TO "detectionQuantity";
ALTER TABLE orders RENAME COLUMN cell_count TO "cellCount";
ALTER TABLE orders RENAME COLUMN preservation_medium TO "preservationMedium";
ALTER TABLE orders RENAME COLUMN sample_preprocessing TO "samplePreprocessing";
ALTER TABLE orders RENAME COLUMN remaining_sample_handling TO "remainingSampleHandling";
ALTER TABLE orders RENAME COLUMN need_bioinformatics_analysis TO "needBioinformaticsAnalysis";
ALTER TABLE orders RENAME COLUMN shipping_method TO "shippingMethod";
ALTER TABLE orders RENAME COLUMN express_company_waybill TO "expressCompanyWaybill";
ALTER TABLE orders RENAME COLUMN shipping_time TO "shippingTime";
ALTER TABLE orders RENAME COLUMN project_number TO "projectNumber";
ALTER TABLE orders RENAME COLUMN product_no TO "productNo";
ALTER TABLE orders RENAME COLUMN unit_price TO "unitPrice";
ALTER TABLE orders RENAME COLUMN other_expenses TO "otherExpenses";
ALTER TABLE orders RENAME COLUMN salesman_name TO "salesmanName";
ALTER TABLE orders RENAME COLUMN salesman_contact TO "salesmanContact";
ALTER TABLE orders RENAME COLUMN technical_support_name TO "technicalSupportName";
ALTER TABLE orders RENAME COLUMN project_type TO "projectType";
ALTER TABLE orders RENAME COLUMN table_status TO "tableStatus";
ALTER TABLE orders RENAME COLUMN created_at TO "createdAt";
ALTER TABLE orders RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE orders RENAME COLUMN submitted_at TO "submittedAt";
ALTER TABLE orders RENAME COLUMN user_id TO "userId";
ALTER TABLE orders RENAME COLUMN sales_dingtalk_id TO "salesDingtalkId";

-- ============================================
-- Sample List Table
-- ============================================
ALTER TABLE sample_list RENAME COLUMN order_id TO "orderId";
ALTER TABLE sample_list RENAME COLUMN order_uuid TO "orderUuid";
ALTER TABLE sample_list RENAME COLUMN sequence_no TO "sequenceNo";
ALTER TABLE sample_list RENAME COLUMN sample_name TO "sampleName";
ALTER TABLE sample_list RENAME COLUMN analysis_name TO "analysisName";
ALTER TABLE sample_list RENAME COLUMN group_name TO "groupName";
ALTER TABLE sample_list RENAME COLUMN detection_or_storage TO "detectionOrStorage";
ALTER TABLE sample_list RENAME COLUMN sample_tube_count TO "sampleTubeCount";
ALTER TABLE sample_list RENAME COLUMN experiment_description TO "experimentDescription";

-- ============================================
-- Pairwise Comparison Table
-- ============================================
ALTER TABLE pairwise_comparison RENAME COLUMN order_id TO "orderId";
ALTER TABLE pairwise_comparison RENAME COLUMN order_uuid TO "orderUuid";
ALTER TABLE pairwise_comparison RENAME COLUMN sequence_no TO "sequenceNo";
ALTER TABLE pairwise_comparison RENAME COLUMN treatment_group TO "treatmentGroup";
ALTER TABLE pairwise_comparison RENAME COLUMN control_group TO "controlGroup";
ALTER TABLE pairwise_comparison RENAME COLUMN comparison_scheme TO "comparisonScheme";

-- ============================================
-- Multi Group Comparison Table
-- ============================================
ALTER TABLE multi_group_comparison RENAME COLUMN order_id TO "orderId";
ALTER TABLE multi_group_comparison RENAME COLUMN order_uuid TO "orderUuid";
ALTER TABLE multi_group_comparison RENAME COLUMN sequence_no TO "sequenceNo";
ALTER TABLE multi_group_comparison RENAME COLUMN comparison_groups TO "comparisonGroups";

-- ============================================
-- Verification Query
-- ============================================
-- Run this after migration to verify:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' ORDER BY ordinal_position;
