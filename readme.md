LIMS客户端下单系统
下单业务流程图
1. 销售人员在钉钉宜搭应用上进行下单，生成一个链接，然后将链接发送给客户，客户通过链接打开下单页面，填写相应内容和分析单。链接包含唯一标识码(uuid)，唯一标识码和订单一一对应。
2. 客户在下单页面填写完成所有内容后，点击提交，即可将数据回传至钉钉宜搭中送样单管理应用中，运营人员可在次对内容进行简单的审批，然后审批通过后，即可进入待收样待检测状态。
3. 客户一旦对应内容今天提交，不可再次进行编辑，如需要编辑，需与运营人员线下沟通，让运营人员开通编辑状态后才可编辑（这里其实有个问题，即客户理论是没有编辑场景的，因为系统已经在第一次录入信息就已经完成所有的在线校验了）
   下单页面功能结构图
1. 下单页面字段
1. 客户信息模块
   1.客户单位名称（自动带出，不可编辑），2.客户姓名（自动带出，不可编辑），3.部门/科室/院系（自动带出，不可编辑），4.科室主任/PI（自动带出，不可编辑），5.客户手机（自动带出，不可编辑），6.客户邮箱（自动带出，不可编辑）
2. 样品信息模块
   1.服务种类（自动带出，不可编辑），2.产品线（自动带出，不可编辑），3.特殊说明（如果您的样品有特殊要求，请备注说明）（文本），4.物种名称（文本，必填），5.物种拉丁名（文本，必填）6. 样本类型（下拉选项，文本，必填，选项内容：植物组织，动物组织，细胞，血液类，外泌体细胞，上清环境样品，粪便，肠道内容物，尿液灌洗液，瘤胃液拭子，发酵物，细菌真菌，DNA，total RNAPCR产物，石蜡包埋样本，其他类型），7.样本类型详述（文本，必填）8.检测数量（数值，必填），9.细胞数（数值），10.保存介质（下拉选项，选项内容：无,乙醇,Trizol,RNA Later,TE Buffer,Nuclease-Free水,AB裂解液,其他保存介），11.样本前处理方式（文本） ，12.剩余样品处理方式（下拉选项，必填，选项内容：返样（收取干冰及快递费用：省内180元/批；省外300元/批，销毁（项目交付后1个月进行销毁），保存样品： 0-3个月 500元/月，保存样品： 3-6个月 1000元/月）13.是否需要生信分析（单选，选项：需要，不需要）
3. 样品运送模块
   1.运送方式（单选，必填，选项内容：自提，快递）
   当运送方式选项为快递时：
   1.快递公司及运单号（文本，必填），2.送样时间（时间选项，必填），3.寄样说明（不可编辑，默认内容：如需干冰寄样则省内寄送时保证有10kg干冰，省外寄送时保证有15kg干冰，（5kg/天）偏远地区请联系销售），4.邮寄信息（不可编辑，默认内容：广东省深圳市龙华区民治街道民康路北114号深圳市计量质量检测研究院2号楼2楼，收件人及联系电话请联系销售）
4. 项目信息模块
   1.项目编号（自动带出，不可编辑），2.检测服务费单价（元/样本）（自动带出，不可能编辑），3.其它费用（自动带出，不可编辑），4.业务员姓名（自动带出，不可编辑），5.业务员联系方式（自动带出，不可编辑），6.技术支持姓名（自动带出，不可编辑）7.项目类型（自动带出，不可编辑）
5. 样品分析模块
   1. 样本清单
   表格，可导入，可下载表格模板，展示填写要求（内容：1. “样本名称“应与送样的管子上完全一致，便于核对样本。名称须具有唯一性，不能出现中文字符、特殊字符（如￥、$、&、@、%等），字符长度在10个以内。2.“分析名称”为生信分析时样本所用名称。“分析名称”和“分组名称”请采用字母、数字和下划线 (即_) 表示(不能有空格和中横线，点号)，长度控制在8个字符以内，首字符必须为字母）
   表格字段：1.序号（自增，不可编辑），2.样本名称（文本，必填，校验：名称须具有唯一性，不能出现中文字符、特殊字符（如￥、$、&、@、%等），字符长度在10个以内），3.分析名称（文本，必填，校验：名称须具有唯一性，请采用字母、数字和下划线 (即_) 表示(不能有空格和中横线，点号)，长度控制在8个字符以内，首字符必须为字母，显隐规则：当《是否需要生信分析》选项为“不需要”时，不显示，反之显示），4.分组名称（文本，必填，校验：请采用字母、数字和下划线 (即_) 表示(不能有空格和中横线，点号)，长度控制在8个字符以内，首字符必须为字母，显隐规则：当《是否需要生信分析》选项为“不需要”时，不显示，反之显示），5.检测或暂存（下拉选项，必填，选项内容：检测，暂存），6.样品管数（数值，必填），7.实验设计描述及样本备注（文本）
   2. 两两比较
   表格，显隐规则：当《是否需要生信分析》选项为“不需要”时，不显示，反之显示，显示注意事项：（
   1、按“分组名称”填写。2、请仔细核对处理组、对照组，切勿颠倒）
   表格字段：1.序号（自增），3.处理组（分子样本）（下拉选项，选项内容根据样本清单的分组名称自动生成）3. 对照组（分母样本）（下拉选项，选项内容根据样本清单的分组名称自动生成），4.比较组方案（处理组 vs 对照组）（文本，根据处理组和对战组的选择自动生成，不可编辑，内容格式：A vs B）
   3. 多组比较
   表格，显隐规则：当《是否需要生信分析》选项为“不需要”时，不显示，反之显示，显示注意事项：（
   1、按“分组名称”填写。2、多组比较的顺序建议按时间或疾病等级依次排序。）
   表格字段：1.序号（自增），2.差异分析比较组（动态新增下拉选项，选项内容根据样本清单的分组名称自动生成，展示形式示例：E vs F vs G）
2. 下单页面数据回显功能
1. 除样品分析模块外，所有字段都可以回显，只是有些只能回显不能编辑。因为销售可能会帮客户填写一些信息。
2. 根据链接的唯一标识码，通过钉钉宜搭查询表单实例数据接口，获取销售人员在宜搭应用填写的下单数据。回显至所有需要自动带出的字段。接口文档：https://open.dingtalk.com/document/development/api-searchformdatasecondgeneration-v2
   1. 这是获取接口的数据结构
   {
   "pageNumber": 1,
   "data": [
   {
   "createTimeGMT": "2025-12-16T11:34Z",
   "modifyUser": {
   "name": {
   "nameInChinese": "戴上杰",
   "nameInEnglish": "戴上杰"
   },
   "userId": "193007455224805338"
   },
   "creatorUserId": "193007455224805338",
   "formUuid": "FORM-D184603ADC1140688858D03704BD351E10JG",
   "modifiedTimeGMT": "2025-12-16T11:34Z",
   "modifier": "193007455224805338",
   "formData": {
   "ServiceTypeName": "中药成分分析完整版-复方或单味药分析\n（有图谱标峰）",
   "associationFormField_mcb8h5rz_id": "\"[{\\\"formType\\\":\\\"receipt\\\",\\\"formUuid\\\":\\\"FORM-9D9A9703D50A447E83375AE73126AFCDLPT4\\\",\\\"instanceId\\\":\\\"FINST-8L666IC1AOUQQECU75EQP9AV0CQZ2WAKCPU4MPWJ2\\\",\\\"subTitle\\\":\\\"7,500\\\",\\\"appType\\\":\\\"APP_IJSUYLJR0N47TLT0JC4Z\\\",\\\"title\\\":\\\"中药成分分析完整版-复方或单味药分析\\\\n（有图谱标峰）\\\"}]\"",
   "CustomerMobilePhone": "15222073212",
   "Discount": 1.75,
   "NameOfSalesman": "戴上杰",
   "ContactInformationOfSalesman": "231331312",
   "DepartmentDirectorPI": "王莹莹",
   "associationFormField_mc8nq2h0_id": "\"[{\\\"formType\\\":\\\"receipt\\\",\\\"formUuid\\\":\\\"FORM-ABF2676B4461465BAEC64D448833CFC8QQS1\\\",\\\"instanceId\\\":\\\"FINST-AXD66JB1TLE16C8DIGQGWBQBB5ZX20BZCI6JMMS2\\\",\\\"subTitle\\\":\\\"王莹莹\\\",\\\"appType\\\":\\\"APP_IJSUYLJR0N47TLT0JC4Z\\\",\\\"title\\\":\\\"北京诺禾致源科技股份有限公司/王莹莹\\\"}]\"",
   "numberField_mcb8h5sd_value": "7500",
   "SamplePreprocessingMethod": "",
   "numberField_mcb8h5sr_value": "313",
   "CustomerMailbox": "Wangyingying@novogene.com",
   "CustomerUnit": "北京诺禾致源科技股份有限公司",
   "Remarks": "",
   "CustomerName": "王莹莹",
   "SpeciesName": "",
   "TechnicalSupport": [
   "戴上杰"
   ],
   "employeeField_mcb8h5sk_id": [
   "193007455224805338"
   ],
   "SaveMedia": "",
   "Salesman": [
   "戴上杰"
   ],
   "CustomerOrderLink": "http://localhost:3000/LN666HB1JME1HDUJNEIJDBAD91T03OE1318JMZX8",
   "OtherExpenses": 313,
   "SpecialInstructionsifYourSampleHasSpecialRequirementsPleaseNoteTheInstructions": "",
   "StandardPrice": 7500,
   "numberField_mcb8h5se_value": "1.75",
   "ServiceTypeOther": "",
   "UnitPriceOfTestingServiceFee": 13131,
   "employeeField_mcb8h5sf_id": [
   "193007455224805338"
   ],
   "NameOfTechnicalSupportPersonnel": "戴上杰",
   "numberField_mcb8h5s1_value": "13131",
   "DepartmentsDepartmentsDepartments": "/",
   "CellNumber": "",
   "UniqueIdentification": "LN666HB1JME1HDUJNEIJDBAD91T03OE1318JMZX8",
   "SampleTypeDetails": "",
   "ExpressCompanyAndWaybillNumber": ""
   },
   "formInstanceId": "FINST-M3D66J71O2E1D5XHGI9N3CV2G8GT34MO318JMF1E",
   "originator": {
   "name": {
   "nameInChinese": "戴上杰",
   "nameInEnglish": "戴上杰"
   },
   "userId": "193007455224805338"
   },
   "title": "戴上杰发起的在线下单",
   "version": 19,
   "instanceValue": "[{\"componentName\":\"TextField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"http://localhost:3000/LN666HB1JME1HDUJNEIJDBAD91T03OE1318JMZX8\"},\"fieldDataUpdated\":false,\"fieldId\":\"textField_mc8nyu50\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"TextField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"\"},\"fieldDataUpdated\":false,\"fieldId\":\"textField_cvesmv8\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"SelectField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{},\"fieldDataUpdated\":false,\"fieldId\":\"selectField_m46m8ce1\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"TextField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"\"},\"fieldDataUpdated\":false,\"fieldId\":\"textField_ui49cr5\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"TextField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"\"},\"fieldDataUpdated\":false,\"fieldId\":\"textField_gde84u9\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"TextField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"15222073212\"},\"fieldDataUpdated\":false,\"fieldId\":\"textField_mcb8h5sp\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"TextField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"Wangyingying@novogene.com\"},\"fieldDataUpdated\":false,\"fieldId\":\"textField_mcb8h5sq\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"NumberField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"1.75\"},\"fieldDataUpdated\":false,\"fieldId\":\"numberField_mcb8h5se\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"NumberField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"7500\"},\"fieldDataUpdated\":false,\"fieldId\":\"numberField_mcb8h5sd\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"TextField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"戴上杰\"},\"fieldDataUpdated\":false,\"fieldId\":\"textField_mcb8h5sj\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"TextField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"\"},\"fieldDataUpdated\":false,\"fieldId\":\"textField_mcb8h5sh\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"TextField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"戴上杰\"},\"fieldDataUpdated\":false,\"fieldId\":\"textField_mcb8h5si\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"NumberField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"313\"},\"fieldDataUpdated\":false,\"fieldId\":\"numberField_mcb8h5sr\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"TextField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"\"},\"fieldDataUpdated\":false,\"fieldId\":\"textField_mj7zeng9\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"EmployeeField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":[{\"label\":\"戴上杰\",\"avatar\":\"//img.alicdn.com/tfs/TB1mKVJSpXXXXcwaXXXXXXXXXXX-78-80.jpg\",\"key\":\"193007455224805338\"}]},\"fieldDataUpdated\":false,\"fieldId\":\"employeeField_mcb8h5sk\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"TextField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"\"},\"fieldDataUpdated\":false,\"fieldId\":\"textField_x3slphv\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"TextField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"\"},\"fieldDataUpdated\":false,\"fieldId\":\"textField_btdlyro\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"DateField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":null},\"fieldDataUpdated\":false,\"fieldId\":\"dateField_m42gbfyj\",\"format\":\"YYYY-MM-DD\",\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"TextareaField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"\"},\"fieldDataUpdated\":false,\"fieldId\":\"textareaField_m3se3fcj\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"TextField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"/\"},\"fieldDataUpdated\":false,\"fieldId\":\"textField_mc8nq2h8\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"TextField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"王莹莹\"},\"fieldDataUpdated\":false,\"fieldId\":\"textField_mc8nq2h6\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"TextField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"王莹莹\"},\"fieldDataUpdated\":false,\"fieldId\":\"textField_mc8nq2h5\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"TextField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"北京诺禾致源科技股份有限公司\"},\"fieldDataUpdated\":false,\"fieldId\":\"textField_mc8nq2h4\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"AssociationFormField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":[{\"formType\":\"receipt\",\"formUuid\":\"FORM-ABF2676B4461465BAEC64D448833CFC8QQS1\",\"instanceId\":\"FINST-AXD66JB1TLE16C8DIGQGWBQBB5ZX20BZCI6JMMS2\",\"subTitle\":\"王莹莹\",\"appType\":\"APP_IJSUYLJR0N47TLT0JC4Z\",\"title\":\"北京诺禾致源科技股份有限公司/王莹莹\"}]},\"fieldDataUpdated\":false,\"fieldId\":\"associationFormField_mc8nq2h0\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"EmployeeField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":[{\"label\":\"戴上杰\",\"avatar\":\"193007455224805338\",\"key\":\"193007455224805338\"}]},\"fieldDataUpdated\":false,\"fieldId\":\"employeeField_mcb8h5sf\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"TextField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"LN666HB1JME1HDUJNEIJDBAD91T03OE1318JMZX8\"},\"fieldDataUpdated\":false,\"fieldId\":\"textField_mc8nyu4z\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"TextField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"中药成分分析完整版-复方或单味药分析\\n（有图谱标峰）\"},\"fieldDataUpdated\":false,\"fieldId\":\"textField_mcb8h5s0\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"SelectField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{},\"fieldDataUpdated\":false,\"fieldId\":\"selectField_m46m8cdy\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"SelectField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{},\"fieldDataUpdated\":false,\"fieldId\":\"selectField_md6ocohe\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"TextField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"231331312\"},\"fieldDataUpdated\":false,\"fieldId\":\"textField_mcb8h5sg\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"NumberField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"13131\"},\"fieldDataUpdated\":false,\"fieldId\":\"numberField_mcb8h5s1\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"AssociationFormField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":[{\"formType\":\"receipt\",\"formUuid\":\"FORM-9D9A9703D50A447E83375AE73126AFCDLPT4\",\"instanceId\":\"FINST-8L666IC1AOUQQECU75EQP9AV0CQZ2WAKCPU4MPWJ2\",\"subTitle\":\"7,500\",\"appType\":\"APP_IJSUYLJR0N47TLT0JC4Z\",\"title\":\"中药成分分析完整版-复方或单味药分析\\n（有图谱标峰）\"}]},\"fieldDataUpdated\":false,\"fieldId\":\"associationFormField_mcb8h5rz\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null},{\"componentName\":\"TextField\",\"dataVersion\":null,\"dateType\":null,\"fieldData\":{\"value\":\"\"},\"fieldDataUpdated\":false,\"fieldId\":\"textField_hyi9ntd\",\"format\":null,\"formatControls\":null,\"listNum\":null,\"options\":[],\"rowId\":null}]"
   }
   ],
   "totalCount": 1
   }
3. 先通过宜搭接口获取数据到数据库中，再通过后台获取。这样可以防止多次访问宜搭接口，提高加载速度。
3. 暂存功能
1. 当用户点击暂存时，当前页面数据暂存至数据库中。
2. 当用户编辑后未点击暂存退出时，要提示用户当前内容未暂存。
4. 提交功能
1. 当前用户提交后，所有字段不能编辑，页面显示状态为已下单。
2. 当前数据提交至数据库中，然后后台再将数据提交至钉钉宜搭应用。
   1. 样品分析模块只需提交到数据库即可，不要提交至钉钉宜搭，因为钉钉宜搭的表单能力较弱，无法承载大量数据和复杂功能表单。实验人员需要点击链接，跳转到下单页面查看样本清单内容。
   2. 提交接口文档：https://open.dingtalk.com/document/development/api-saveformdata-v2
   技术方案
1. 优先开发PC端。
2. 使用nextjs开发，使用js不要用ts，使用mysql作为数据库，使用pm2作为部署和服务工具。
3. 使用AI开发工具辅助开发
4. 技术难点
1. 样本清单可能会导入数据量较大，如上千条数据，这时需要使用虚拟加载表格进行处理，不要分页，因为客户经常使用execl表做为样本清单，所有表单设计要符合execl表的使用习惯，比如批量复制。
2. 错误校验，当前出现错误时，需要把错误的表红，比提示错误内容，方便客户修改。
3. 需要根据钉钉宜搭接口的数据格式处理数据。
   接口参数
   钉钉宜搭参数：
   {
   "formUuid": "FORM-D184603ADC1140688858D03704BD351E10JG",
   "systemToken": "R8E66G81C7E11M0ON97O497HGBCR3VJ9ZY7JMZRZ",
   "userId": "193007455224805338",
   "appType": "APP_O1HLHANBEJ2G788IOXWF",
   "searchCondition": "[{\"key\":\"UniqueIdentification\",\"value\":\"LN666HB1JME1HDUJNEIJDBAD91T03OE1318JMZX8\",\"type\":\"TEXT\",\"operator\":\"eq\",\"componentName\":\"TextField\"}]",
   "useAlias": true
   }