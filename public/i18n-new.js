/**
 * Client-side i18n translation engine (English-native)
 * DOM text replacement: walks text nodes and replaces English → Chinese
 * when the user's language is set to Chinese.
 */
(function () {
    'use strict';

    var LANG = window.__lang || 'en';

    // Hide page when switching to Chinese to avoid English flash
    if (LANG !== 'en') {
        var _i18nStyle = document.createElement('style');
        _i18nStyle.textContent = 'body{opacity:0!important;transition:opacity .15s}';
        (document.head || document.documentElement).appendChild(_i18nStyle);
    }
    function _revealPage() {
        if (_i18nStyle && _i18nStyle.parentNode) {
            _i18nStyle.parentNode.removeChild(_i18nStyle);
        }
    }

    // ==================== English → Chinese dictionary ====================
    var dict = {
        " size file(s)": "尺寸",
        "[BOTTOM/PANTS] Position Selection:": "[下装/裤装] 位置选择：",
        "[TOP/ONE-PIECE] Position Selection:": "[上装/连体] 位置选择：",
        "/ pc": "/ 件",
        "※ OEM MOQ may vary depending on style complexity and other factors. Subject to actual assessment.": "※ OEM 起订量可能会随款式难度等因素有所调整，具体以实际评估为准。",
        "$40/style. Uses substitute materials, for checking pattern, sizing and overall effect.": "$40/款。使用替代面辅料，仅供检查版型、尺寸及整体效果。",
        "$50/style. Uses correct bulk materials, fully replicates production effect.": "$50/款。使用正确面辅料，完整还原大货效果。",
        "100% biodegradable, premium texture": "100%可降解，触感高级",
        "25-40 Days": "25-40天",
        "3-5 Days": "3-5天",
        "3D relief texture effect": "立体浮雕触感",
        "8-15 Days": "8-15天",
        "A requirement number will be generated after submission. Sales manager will contact you within 1 business day.": "提交后系统将生成需求编号，业务经理将在1个工作日内联系您。",
        "A. Material & Bag Type": "A. 材质与袋型",
        "About 5-8mm, basic light support": "约 5-8mm，基础微托力",
        "Above fees are basic sampling costs, excluding printed labels, rhinestones, digital printing, etc. Extra charges apply if needed.": "上述费用为基础打样费，不含印标、镶钻、数码印花等增值工艺，如涉及将另行核算。",
        "Accessories Configuration Mode": "饰品配置模式",
        "Accurate fiber composition and percentages": "准确的纤维成分及百分比",
        "Action": "操作",
        "Add New Sample Item": "添加新打样项",
        "Add Style Production Item": "添加款式生产项",
        "Additional Notes": "补充说明",
        "Adjuster / Ring": "调节扣/环",
        "AI / PDF / Image formats supported (Max 20MB)": "支持 AI / PDF / 图片格式 (Max 20MB)",
        "Air Freight": "空运 (时效型)",
        "Air Freight Line": "空运专线",
        "All brand trims configured here are for bulk production cost estimation. The sampling stage uses factory standard trims. Trims involving Logo mold or custom printing are subject to MOQ limits and typically won't be implemented during sampling.": "本步骤配置的所有品牌辅料主要用于大货生产的成本核算与规划。打样阶段将优先使用工厂通用辅料，暂不受此配置影响。需注意，涉及 Logo 开模或定制印刷的辅料因受最低起订量 (MOQ) 限制，通常不会在打样环节单独落实。",
        "All design materials and derived patterns uploaded by Party A, all IP and copyrights belong entirely to Party A. Party B will only use such materials for sampling and bulk production designated by Party A.": "甲方上传的所有设计资料及产生的衍生版型，其全部知识产权及商业版权均完全归甲方所有。乙方仅将上述资料用于甲方指定的产品打样及大货生产环节。",
        "All designs are protected by": "所有设计均受",
        "All MOQs refer to \"Per Style, Per Color\". Within the same color, sizes can be mixed.": "以下所有起订量（MOQ）均指 \"单款单色 (Per Style, Per Color)\"。同一颜色内，尺码可按您的需求配比混合装箱。",
        "Already have an account? Login": "已有账号？返回登录",
        "and we'll send you a reset link.": "我们将向您发送重置链接。",
        "Any Mode + Special Materials, Colors & Prints": "任何模式 + 特殊面辅料、颜色/印花",
        "Any special requirements not covered in previous steps? (e.g., eco-certification standards, testing requirements, etc.)": "您还有哪些在前面步骤中未能详细说明的特殊要求？（如：需要通过某种特定的环保验厂标准、特定的测试要求等）",
        "Application & Delivery Rules": "粘贴与交付规则",
        "Application Diagram": "粘贴图示 (选填)",
        "Application Position & Quantity Rules": "粘贴位置与数量规则",
        "Arranged in descending order by weight": "按重量递减排列",
        "Article 1: Confidential Content & Scope": "第一条 保密内容与范围",
        "Article 2: Intellectual Property Ownership": "第二条 知识产权归属",
        "Article 3: Data Destruction & Breach Liability": "第三条 数据销毁与违约责任",
        "As a body-touching, non-exposed lining, the industry default is black or white. Specifying custom-dyed special colors (e.g., contrast lining) will significantly increase the bulk MOQ and may incur additional fees.": "作为贴身且不外露的内衬，行业默认使用 黑色或白色。若您指定定染特殊颜色（如撞色里布），大货起订量 (MOQ) 将大幅提升，且可能产生额外费用。",
        "At least one recommended laundering and care instruction.": "至少一种推荐的洗涤和保养说明（文字或符合ASTM标准的图标）。",
        "Australia": "澳大利亚",
        "Back Clasp": "背扣",
        "Back Insert Clasp / Hook Clasp": "后背插扣/钩扣",
        "Back to Login": "返回登录",
        "Base Sample Fee": "基础打样费",
        "Before bulk production, a paper/electronic NDA with legal force can be separately signed per your corporate compliance requirements.": "后续进入大货生产环节前，可根据您的企业合规要求，另行签署具有实体法律效力的纸质版/电子签章版 NDA 协议。",
        "Beyond 2 pieces, extra sewing fee charged per piece.": "超过 2 件的部分，每件加收相应缝制费。",
        "Black": "黑色",
        "Bottom / Swim Trunks": "下装 / 泳裤",
        "Bottom Cut Adaptation": "适配底裤剪裁",
        "Bottom thickened, raised 1.5cm+": "底部加厚垫高 1.5cm+",
        "Bottom/Pants - Custom position description": "下装/裤装 - 自定义位置描述",
        "Brand Trims": "品牌辅料",
        "Brand Trims Settings": "品牌辅料设置",
        "Brand Website / SNS": "品牌官网 / SNS (选填)",
        "Brief identifier": "简要标识",
        "Brief identifier (e.g., Red one-piece / Page 1 Bikini top)": "简要标识 (如: 红色连体款 / Page 1 比基尼上衣)",
        "Briefly describe the overall info of styles you are uploading, e.g. product type, design style, target market, etc.": "简要描述您即将上传的款式的整体信息，例如：产品类型、设计风格、目标市场等",
        "Browse": "浏览",
        "Browse Files": "浏览文件",
        "Bulk Destination:": "大货目的地：",
        "Bulk Order": "大货下单",
        "Bulk Refund Plan:": "大货退还计划：",
        "Bust Shaping Underwire": "胸部定型钢圈",
        "Cancel": "取消",
        "Center Back Neck": "领后中",
        "Center Back Waist": "后腰内中",
        "China": "中国",
        "Choose your customization mode: select from our library (ODM) or upload your own design package (OEM). Multiple styles supported.": "请选择定制模式：从现有库中挑选 (ODM) 或 上传自主设计包 (OEM)，支持同时选择/上传多款。",
        "Clear": "清空当前选择",
        "Clear All Options": "清空当前所有选项",
        "Clear all selected metal parts": "清空所有已选金属件",
        "Clear current fabric category selections only": "仅清空当前面料分类的选择",
        "Clear current mode selections only": "仅清空当前模式的选择",
        "Click here to upload reference attachments": "点击此处上传参考附件",
        "Click to Upload": "点击上传",
        "Click to upload AI / PDF / HD images": "点击上传 AI / PDF / 高清图",
        "Click to Upload Attachment": "点击上传附件",
        "Click to upload brand Logo vector file": "点击上传品牌 Logo 矢量图 (AI / PDF / 高清 PNG)",
        "Click to upload comprehensive tech pack / proposal": "点击上传综合工艺单/企划书",
        "Click to upload images or PDF lists": "点击上传图片或 PDF 清单",
        "Click to upload reference files": "点击上传参考文件",
        "Click to Upload Shipping Marks / FBA Labels / Packaging Reference": "点击上传唛头样式 / FBA标签 / 包装参考图",
        "Click to view full HD image": "点击查看高清全图",
        "Client Profile": "客户档案",
        "Coated Paper": "铜版纸",
        "Color Blocking Notes & Reference Attachments": "拼色说明与参考附件 (可选)",
        "Color Fastness Grade 4+": "色牢度 4 级以上 (Color Fastness 4+)",
        "Color Logo or full tiled print": "彩色Logo或平铺满印",
        "Color Match Reference": "调色对照参考",
        "Commercial Identity": "商业身份档案",
        "Commercial Notice:": "商业提示：",
        "Commercial notice: Custom printed packaging bags — 1-color MOQ 1000 pcs, multi-color MOQ 5000 pcs.": "商业提示：定制印刷包装袋单色 MOQ 1000 个起，彩色 MOQ 5000 个起。",
        "Common Country Clothing Label Compliance Reference": "常见国家服装标签合规要求参考",
        "Company / Brand Name": "公司/品牌名称",
        "Compare with the swatch card above, enter number(s). E.g.: 24, 36...": "对照上方色卡，输入数字编号。例如：24, 36...",
        "Compliance Notice": "法规与合规性提醒",
        "Comprehensive Tech Pack": "综合参考附件",
        "Configuration Options": "配置选项",
        "Configure your brand trims in the tabs below. If you don't need a certain trim, keep the default \"No\".": "请在下方标签页中分别配置您需要的品牌辅料。如果不需要某项辅料，保持默认“否”即可。",
        "Confirm": "确认修改",
        "Confirm & Submit": "确认提交",
        "Confirm New Password": "确认新密码",
        "Contact Email / WhatsApp": "联系邮箱 / WhatsApp",
        "Contact Name": "联系人姓名",
        "Core Paper Material": "核心纸张材质",
        "Core Principle:": "核心原则：",
        "Corresponding Style": "对应款式",
        "Cost + Insurance + Freight": "成本+保险+运费",
        "Country of Origin Declaration": "原产地声明",
        "Country of origin marking must be clear and independent.": "原产地标识要求非常严格（必须清晰且独立）。",
        "Craft Reference Image": "工艺参考图",
        "Craft Requirements Description": "工艺需求描述",
        "Create Account": "创建账号",
        "Critical Specifications Checklist": "核心工艺与细节确认单",
        "Cup Shape & Size": "罩杯形状与尺码",
        "Cups/Pads:": "罩杯/胸垫:",
        "Current User: ": "当前用户：",
        "Custom Define Details": "自主定义细节",
        "Custom Design (OEM) Style Count:": "自主设计 (OEM) 款式数:",
        "Custom Development / Global Sourcing": "定制开发/全球找样",
        "Custom Die-Cut Shape": "异形定制",
        "Custom Material & Shape": "定制材质与形状",
        "Custom Other Position": "自定义其他位置",
        "Custom Print": "定制印花",
        "Custom printing MOQ is 10000 pcs. Without artwork, default English safety message printed.": "定制印刷（单色/彩色）起订量 MOQ 均为 10000 枚。若无图稿，默认印制通用英文安全提示语。",
        "Custom Requirements": "定制需求",
        "Custom Shape / Material Description": "定制形状/材质描述",
        "Custom Shape / Specific Size Description": "定制形状/特定尺寸描述",
        "Custom spec MOQ requirement: usually 5000 minimum order": "自定义规格 MOQ 要求：通常需 5000 个起订",
        "Custom special shapes (e.g., Logo loops) or special materials, MOQ typically 5000 sets.": "定制特殊形状（如开模 Logo 吊粒）或特殊材质，起订量 (MOQ) 通常为 5000 套起。",
        "Customer-Supplied Fabric Details": "客供面料明细描述",
        "Customer-Supplied Material Details": "客供物料明细描述",
        "Customization Description": "定制需求描述",
        "Declaration: By clicking \"Submit\", both parties automatically enter into the above confidentiality terms.": "声明：在您点击“提交定制需求”时，即代表双方自动缔结并生效上述保密条款。",
        "Decorative Plates, Pendants, etc.": "装饰牌、吊坠等",
        "Dedicated Team Assignment": "团队服务指派",
        "Default Packaging Plan:": "默认包装方案：",
        "Delivered at Destination": "到岸交货",
        "Delivery Method": "交付方式",
        "Describe in the text box below": "在下方文本框描述",
        "Describe specification (e.g.: inner diameter 1.2cm), quantity per piece, etc...": "请描述规格要求（如：内径 1.2cm）、单件用量等...",
        "Describe the composition, color, roll count and total meters of fabric you are sending...": "请描述您寄送的面料成分、颜色、卷数及总米数...",
        "Describe the loop shape (e.g., round, Logo outline) or material (e.g., cotton, metal, wood)...": "请描述您需要的吊粒形状（如圆形、Logo外形）或材质（如全棉、金属、木质）...",
        "Describe the paper properties, thickness, texture, or GSM requirements...": "请描述您需要的纸张特性、厚度、纹理或克重要求...",
        "Describe the special printing craft and its application areas...": "请描述您需要的特殊印刷工艺及其应用部位...",
        "Describe the special sewing position, folding method, or attachment...": "请描述您需要的特殊缝制位置、折法或固定方式...",
        "Describe your color blocking plan, color distribution, or special modification requirements...": "请详细描述您的拼色方案、色彩分布部位或特殊修改要求...",
        "Describe your light customization needs in detail.": "请详细描述您的轻定制需求。",
        "Describe your special label material requirements...": "请描述您需要的特殊标签材质...",
        "Design / Logo Upload": "设计稿/Logo上传",
        "Design Draft / Logo Upload": "设计图稿/Logo上传",
        "Design Drafts & Layout Requirements": "设计稿与排版要求",
        "Design Upload": "设计稿上传",
        "Desired Color": "希望颜色",
        "Destination & Trade Terms": "目的地与交货条款",
        "Detailed Metal Specs": "金属件明细定义",
        "Detailed Production List": "详细生产清单",
        "Detailed Requirements Description": "详细需求说明",
        "Detailed Sampling List": "详细打样清单",
        "Detailed Sewing/Printing Placement": "详细缝制/烫印位置",
        "Development Scale Confirmation": "开发规模确认",
        "Die-cut template / special shape reference": "刀模图/异形参考 (选填)",
        "Die-cut template / special shape reference (Required)": "刀模图/异形参考 (必填)",
        "Do you have other trim requirements?": "是否有其他辅料需求？",
        "Do you need branded hang tags?": "是否需要品牌吊牌？",
        "Do you need branded packaging bags?": "是否需要定制品牌包装袋？",
        "Do you need cups/padding?": "是否需要配备罩杯/胸垫？",
        "Do you need metal hardware?": "是否需要金属饰品？",
        "Do you need sewn/tagless labels?": "是否需要缝制/无感标签？",
        "Do you need underwear hygiene stickers?": "是否需要底裤卫生贴？",
        "Draft restored": "已恢复暂存草稿",
        "Draft saved. Restore from User Center.": "暂存成功，可在用户中心恢复",
        "Drag or click to upload images": "拖拽或点击上传图片",
        "Drag or click to upload size files": "拖拽或点击上传尺寸文件",
        "Drag or click to upload tech files": "拖拽或点击上传工艺文件",
        "During bulk production, we auto-grade and match pad sizes for different garment sizes (S, M, L, XL). Unless you have special mold requirements, we recommend auto matching.": "我们将在大货生产中，根据成衣的不同尺码 (如 S, M, L, XL)，自动为您放缩并匹配对应大小的胸垫，确保每件衣物呈现完美的穿着比例。除非您有特殊的开模定制需求，否则建议交由我们自动匹配。",
        "Duties & Taxes Paid": "双清包税",
        "e.g.,": "如:",
        "e.g., 10.50 - 13.00": "如: 10.50 - 13.00",
        "E.g., 2026 Summer Neon Series": "例如: 2026 Summer Neon Series",
        "e.g., 220g": "例: 220g",
        "e.g., 500": "例如: 500",
        "e.g., 80% Nylon 20% Spandex": "例: 80% Nylon 20% Spandex",
        "e.g., Length(L) x Width(W) cm": "例如: 长(L) x 宽(W) cm",
        "e.g., Main label: Center Back Neck heat transfer, care label: Left Side Seam high-density woven. Sizes are...": "例如：主标用领后中无感烫印，洗水标用左侧缝高密织唛。尺寸分别为...",
        "e.g., Master Wang": "如: 王师傅 (选填)",
        "e.g., Need a custom one-piece padding, or specify cup length and width for each size...": "如：需要定制特殊的一体式连体胸垫，或者是指定每个尺码的具体杯长杯宽...",
        "e.g., Need a specific shape to match a special cutout bottom design, or irregular Logo contour...": "如：需要特定形状以适配特殊的镂空底裤设计，或者Logo轮廓异形...",
        "e.g., Need specific size 4.5x10cm, or round corner processing...": "如：需要特定尺寸 4.5x10cm，或者圆角处理...",
        "e.g., One-piece garments don't need stickers, only separate bottoms; or request sticker placed rearward to cover back seam...": "例如：连体衣无需贴，仅分体下裤贴；或者要求贴纸偏后以遮盖后缝线...",
        "e.g., Pantone 19-4052 or Navy Blue": "例: Pantone 19-4052 或 海军蓝",
        "e.g., Repeat unit 20cm or Logo width 10cm": "例: 循环单元 20cm 或 Logo 宽 10cm",
        "e.g., Sarah Chen": "如: Sarah Chen (选填)",
        "e.g., Self-supplied 15cm YKK metal zipper, gold, 100 pcs...": "例如：自供 15cm YKK 金属拉链，金色，100条...",
        "e.g., Self-supplied breathable standing cotton padding, nude, 500 pairs...": "例如：自供透气直立棉胸垫，肤色，500副...",
        "e.g., Team A": "如: A组 (选填)",
        "E.g., the shoulder straps are widened to 2 cm, and zigzag edge finishing is applied, etc.": "例如：肩带加宽至2cm、使用zigzag边缘工艺等...",
        "E.g.: Left chest, etc.": "如：左胸前等",
        "E.g.: Only front panel lined, back panel single layer; or only crotch area lined...": "例如：仅前幅加里料，后幅单层；或仅裆部加里料...",
        "E.g.: Replace with breathable standing cotton, memory foam; or edges need heat-press treatment...": "如：需要替换为透气直立棉、记忆棉；或边缘需要热压处理等...",
        "Each style includes 1 piece by default, 1 extra free (max 2 free per style).": "每款默认包含 1 件，可免费加做 1 件（最多 2 件免费）。",
        "Each style includes 1 sample by default, 1 extra free (max 2 free per style); beyond 2, extra sewing fee charged per piece": "每款打样默认包含 1 件样衣，可额外免费制作 1 件（即每款最多免费 2 件）；超过 2 件的部分，每件加收相应缝制费",
        "Eco Bulk Packing": "环保混装",
        "Eco Matte Paper": "环保哑光纸",
        "Email": "常用邮箱",
        "Embossing / Debossing": "凹凸印",
        "Enter and confirm your new password.": "请输入您的新密码并确认。",
        "Enter layout requirements (e.g.: Logo centered, gold/silver eyelets needed...)": "请输入排版要求（例如：Logo居中，需打金银扣眼...）",
        "Enter Pantone number or color description...": "请输入潘通色号或颜色描述...",
        "Enter text to be printed (e.g., HYGIENE LINER - PLEASE DO NOT REMOVE), or special layout requirements...": "请填入需要印刷的文字（如：HYGIENE LINER - PLEASE DO NOT REMOVE），或特殊的排版要求...",
        "Enter the closest color number from the solid swatch (e.g.: 24) to help the colorist match.": "请填写纯色色卡中接近的色号 (如: 24)，方便调色师对照纠偏",
        "Enter the email used during registration,": "请输入您注册时使用的邮箱，",
        "Enter the name/ID of the sales manager, pattern maker or sample team that served you well. New clients leave blank for smart matching.": "您可以输入曾为您提供过优质服务的业务经理、打版师或样衣组的姓名/编号。新客户请留空，系统将为您智能匹配最合适的专业团队。",
        "Enter the specific bottom/pants label position, e.g., right back waist external label...": "请输入具体的下装标签安装位置，如：右后腰外置贴标...",
        "Enter the specific top/one-piece label position, e.g., left chest exposed, right cuff...": "请输入具体的上装标签安装位置，如：左胸前外露、右袖口...",
        "Enter the specified color description or Pantone number...": "请输入指定颜色描述或潘通色号...",
        "Enter the text content to be printed on the label (composition, origin, wash care symbols, etc.), or layout requirements...": "请在此输入标签需要印制的文字内容（成分、产地、洗水标识等），或排版要求...",
        "Enter trim name, material, size, color, and expected garment placement.": "请详细输入辅料名称、材质、尺寸、颜色，以及预期用在衣物的哪个部位。",
        "Enter trim name, material, size, color, and expected garment placement.\ne.g., Need a 15cm black YKK invisible zipper for back opening...": "请详细输入辅料名称、材质、尺寸、颜色，以及预期用在衣物的哪个部位。\n例如：需要 15cm 长的黑色 YKK 隐形拉链，用于后背开襟...",
        "Estimated Bulk Quantity": "预估大货数量",
        "Estimated Sample Fee (USD)": "预估打样费 (USD)",
        "Europe": "欧洲",
        "European Union": "欧盟",
        "Evaluate Bulk Estimate Price": "评估大货预估价",
        "Exclusive Custom · Quality Tracking": "专属定制 · 品质追踪",
        "Expected Composition": "预期成分",
        "Expected GSM": "预期克重",
        "Expected Incoterms": "预期交货条款",
        "Expected Shipping Method": "预期发货方式",
        "Extra Sewing Fee": "超出缝制费",
        "Fabric Configuration": "面料配置",
        "Fabric Material": "面料材质",
        "Fabric Requirements Description": "面料需求描述",
        "Fabric Sample Photos / Shipping List Upload": "面料实物样照/发货清单上传",
        "Factory Pickup": "工厂提货",
        "Factory pickup, self-arranged": "工厂提货自理",
        "Fee Notice:": "费用说明：",
        "Fiber composition in the target country's official language.": "使用目标国官方语言表述的纤维成分。",
        "Figure-8 Clasp, O-Ring": "8字扣、O型环",
        "Fill in if shipped; if not yet shipped, inform sales manager later": "若已寄出请填写；若尚未寄出，可稍后告知业务经理",
        "Fill in if shipped...": "若已寄出请填写...",
        "Final Notes": "最终补充要求",
        "Final Remarks & Confirmation": "最终补充与条款确认",
        "Fits 95% one-piece/triangle styles": "适配 95% 连体/三角款式",
        "For special custom trims (e.g.: YKK waterproof zipper, anti-slip silicone band, reflective drawstring, etc.), detail here.": "如需特殊定制的辅料（如：YKK防水拉链、品牌防滑硅胶带、反光抽绳、特殊丈根松紧带等），请在此详细说明。",
        "Forgot password?": "忘记密码？",
        "Full Lining": "全衬里",
        "Gold / Silver Foil Stamping": "烫金 / 烫银",
        "Gunmetal": "枪黑色",
        "H-Button, Press Stud": "工字扣、揿扣",
        "Hang Tag": "吊牌",
        "Hang Tag Configuration Mode": "吊牌配置模式",
        "Hang Tag String / Loop": "吊粒挂绳",
        "Hang Tag:": "吊牌:",
        "Hardware Finish Color": "硬件电镀色调",
        "Hongxiu Bulk MOQ Standard": "红绣服饰 大货起订量标准",
        "Hongxiu Clothing": "红绣服饰",
        "Hongxiu Clothing Co., Ltd Material Warehouse, 10-8A Tiexi Road, Xingcheng, Liaoning": "辽宁省兴城市铁西路10-8A红绣服饰有限公司 物料仓",
        "Hongxiu Clothing Co., Ltd, 10-8A Tiexi Road, Xingcheng, Liaoning, China": "中国辽宁省兴城市铁西路10-8A红绣服饰有限公司",
        "Hongxiu Commercial NDA": "《红绣商业保密协议 (NDA)》",
        "Hongxiu Custom System": "红绣服饰定制系统",
        "Hongxiu defaults to low-tack medical-grade adhesive, applied 2cm forward of center crotch. For special requirements, specify here.": "红绣默认将使用低粘医用级背胶，贴于泳衣裆部正中偏前 2cm 处。如有特殊要求（如多件套的粘贴分配），请在此说明。",
        "Hongxiu Professional Suggestions:": "红绣专业建议：",
        "Hongxiu QA Standards": "红绣品质标准",
        "Hongxiu Smart Match": "红绣智能代配 (推荐)",
        "Hongxiu Swimwear Sampling Fee Standard": "红绣服饰 泳装打样收费标准",
        "Hongxiu's existing proven patterns with standard market fabrics, colors and universal trims. Fast reorder, ideal for market testing.": "红绣现有成熟版型，搭配市场现货常规面料、常规颜色及通用辅料。极速返单，适合试水测款。",
        "Hygiene Sticker": "卫生贴",
        "Hygiene Sticker Configuration Mode": "卫生贴配置模式",
        "Hygiene:": "卫生贴:",
        "I confirm all configuration requirements above are accurate. All my uploaded design files, brand assets, and business data are protected by": "我确认上述填写的所有配置需求准确无误。我上传的所有设计稿件、品牌资产及商业数据均受",
        "I don't need factory application. Ship in rolls with bulk order for self-application.": "我不需要工厂代贴标，请随大货卷装发出自行贴标。",
        "I have special custom shape or specific size requirements": "我有特殊的定制形状或特定尺寸需求 (需重新开模)",
        "I need connected hang tags": "我需要子母吊牌 (两张及以上一套)",
        "I need custom specific size": "我需要自定义特定尺寸 (否则默认使用红绣常规尺寸)",
        "I need to customize the brand main label and wash care label separately": "我需要将品牌主标与洗水成分标分开定制",
        "I Understand": "我已了解",
        "I will purchase and send this trim myself": "我将自行采购并寄送该辅料 (CMT 模式)",
        "I will purchase and ship fabrics/materials myself": "我将自行采购并寄送面辅料 (CMT 模式)",
        "I will send physical fabric/garments for color matching and quality inspection": "我将寄送实物面料/样衣供开发对色与质检",
        "If applicable, functional garments (e.g., swimwear) require UPF rating declaration.": "如适用，特定功能性服装（如泳衣、防晒服）需提供 UPF 防晒等级声明。",
        "If cooperation terminates, Party B must destroy related design data at Party A's request. Breach of confidentiality requires full compensation for all direct commercial losses and legal costs.": "若双方合作终止，乙方有义务应甲方要求彻底销毁系统内的相关设计数据。如乙方违反上述保密约定，需全额赔偿由此给甲方造成的一切直接商业损失及法务成本。",
        "If this is a multi-piece set and you only need one piece, specify below.": "若该款式为多件套且您仅需其中单件（如仅要上衣或仅要底裤），请务必在下方明确说明。",
        "If verifying grading, add a max or min size at PP stage.": "如果您需要核对放码比例，建议在正确样阶段增加一个最大或最小码。",
        "If you are a returning Hongxiu client:": "如果您是红绣的老朋友：",
        "If you have no concept of size, please upload a garment mockup above. The pattern maker will accurately replicate it based on the image.": "如果您对尺寸没有概念，请在上方区域上传一张成衣效果图 (Mockup)。通过图片展示印花在泳装上的比例位置，版师将据此为您精准还原。",
        "If you've declared multiple designs, please ensure the uploaded reference image filenames or tech pack page numbers clearly correspond to the \"Style 1, Style 2...\" descriptions in Section A.": "若申报了多款设计，请确保下方上传的参考图文件名或工艺单页码能与 A 区域填写的“款 1、款 2...”描述清晰对应。",
        "Images, PDF, AI supported (Max 20MB)": "支持图片、PDF、AI (Max 20MB)",
        "Important: Smart matching only covers common parts. For specially shaped hardware, irregular clasps, or custom Logo mold on hardware, switch to \"Custom Define Details\".": "重要提示：智能代配仅涵盖通用基础件。如果您在设计中包含了特殊形状的五金、异形扣，或需要在五金上开模定制品牌 Logo，请务必切换至右侧的「自主定义细节」中逐一提交要求。",
        "Importer's or manufacturer's registered EU address.": "进口商或制造商在欧盟境内的注册地址。",
        "Incl. pattern, management & sewing, 2 pcs free per style": "含制版·管理·缝制，每款免费含2件",
        "Including: custom Pantone dyeing, special texture sourcing, brand exclusive hardware mold, etc.": "包含且不限于：面料定染指定 Pantone 色、特殊肌理面料找样、品牌专属五金开模等。",
        "Individual Bagging Method": "单件入袋方式",
        "Individual Packaging": "独立包装",
        "Information for reference only, not legal advice. Confirm latest regulations with your local customs broker before production.": "以下信息仅供排版参考，不作为最终法律依据。强烈建议您在投产前向当地报关代理确认最新法规。",
        "Inquiry data loaded. Edit and resubmit.": "已加载询盘数据，修改后重新提交",
        "Inquiry data restored": "已从历史询盘复制数据",
        "Inquiry data restored (with attachments)": "已从历史询盘复制数据（含附件）",
        "International Express": "国际快递",
        "International sample shipping at customer's expense. Specific costs quoted after we obtain your detailed shipping address and complete packing calculations.": "样品国际运费需由客户自理。由于样品重量及包裹体积不确定，具体运费需待我们获取您的详细收货地址并完成打包核算后，方可为您提供最终物流报价。",
        "Key Suggestion:": "核心建议：",
        "Kraft Paper": "牛皮纸",
        "Label": "标签",
        "Label Configuration Mode": "标签配置模式",
        "Label Installation Component & Placement": "标签安装部位与位置",
        "Label Material": "标签材质",
        "Label Size": "标签尺寸 (长x宽)",
        "Label:": "标签:",
        "Layout Requirements / Text Content": "排版要求 / 文字内容",
        "Left Side Seam": "左侧缝",
        "Length (cm)": "长 (cm)",
        "Lining Coverage": "里料覆盖范围",
        "Lining: N/A": "里: 未选",
        "List / Sample Photo Upload": "清单/样照上传",
        "Loading fabric data...": "正在加载面料数据...",
        "Loading packaging bag library...": "正在加载包装袋库...",
        "Loading required checklist...": "正在加载必填核对单...",
        "Loading style data...": "正在加载款式数据...",
        "Log In": "登 录",
        "Log Out": "安全退出",
        "Login": "用户登录",
        "Logo shapes, etc.": "Logo形状等",
        "Loop / String Color": "挂绳/吊粒颜色",
        "Loop Type": "吊粒类型",
        "Lower Left Side Seam": "左侧缝下端",
        "Main label / tagless preferred": "主标/无感标首选",
        "Main: N/A": "面: 未选",
        "Mainland China": "中国大陆",
        "Maintain original texture, minimalist preferred": "保持原质感，极简优选",
        "Management Fee:": "管理费：",
        "Mandatory detailed care instructions in English.": "强制使用英文的详细护理说明。",
        "Manufacturer's RN number or full company name.": "制造商的 RN 号或完整公司名称。",
        "Material or Craft Description": "材质或工艺描述",
        "Material or Special Requirements Description": "材质或特殊要求描述",
        "Material, Shape & Size": "材质、形状与尺寸",
        "Metal Cord End": "金属吊钟",
        "Metal Hardware": "金属饰品",
        "Metal Hardware:": "金属饰品:",
        "Metal Zipper": "金属拉链",
        "Metallic sheen highlight LOGO": "金属质感高亮LOGO",
        "Mixed Colors Mixed Sizes": "混色混码",
        "Moisture-proof, durable, very fast delivery": "防潮耐用，出货极快",
        "MOQ 100 pcs": "MOQ 100件",
        "MOQ 300+ pcs": "MOQ 300件起",
        "MOQ 50 pcs": "MOQ 50件",
        "MOQ Tier Standard": "起订量(MOQ)阶梯标准",
        "Most versatile, universal style": "通用性最强，百搭款",
        "Must be in a prominent position on the neck label.": "必须位于颈部标签的显著位置。",
        "Must include front and back designs of main/sub tags": "需包含主/副牌正、反两面设计稿",
        "Must use ISO/GINETEX standard care symbols (typically 5 basic symbols in order: washing, bleaching, drying, ironing, professional textile care).": "必须使用 ISO/GINETEX 体系标准的洗水符号 (通常5个基本符号按顺序排列：洗涤、漂白、干燥、熨烫、专业纺织品维护)。",
        "Need custom brand Logo on this accessory?": "需要在该配件上定制品牌 Logo?",
        "Needle Detection Pass": "针检合格",
        "Network error, please try later": "网络连接失败，请稍后再试",
        "New Password": "新密码",
        "New Zealand": "新西兰",
        "Next Step": "继续下一步",
        "No": "否",
        "No account? Register": "没有账号？点击注册",
        "No Additional Craft": "无附加工艺",
        "No need to select basic hardware one by one. The pattern maker will auto-match high-quality, rust-proof and chlorine-resistant standard parts (clasps, O-rings, back clasps, etc.) matching your selected color.": "您无需逐一挑选基础五金。版师将根据您的款式结构，自动匹配防锈防氯的高品质标准件（如常规 8 字扣、O 环、背扣等），确保颜色与上方所选完全一致。",
        "Non-Disclosure Agreement": "商业保密协议",
        "Non-Disclosure Agreement (NDA)": "保密协议 (NDA)",
        "Not Required": "不需要",
        "Not Selected": "未选择",
        "Note:": "注意：",
        "Note: Connected tags usually involve multiple material layers, please detail below.": "注：子母牌通常涉及多种材质叠加，请在下方详细说明。",
        "Note: Custom Logo mold requires a mold opening fee, and bulk MOQ is typically 500-1000 pcs/style.": "注：定制专属 Logo 模具需支付开模费，且大货起订量 (MOQ) 通常为 500-1000 件/款。",
        "Note: For universal gourd shape, default standard size is about 5x11cm.": "注：如果是通用葫芦形，常规尺寸默认约为 5x11cm。",
        "Note: If checked, specify size, material, and installation position of each label below.": "注：若勾选此项，请在下方明确指出主标与洗水标各自的尺寸、材质及安装位置。",
        "Note: Photos may have slight color differences due to screen. Final color is based on the physical pre-production sample or swatch provided by Hongxiu.": "注：实拍图受屏幕材质与亮度影响存在微小色差，最终颜色确认将以红绣提供的实物产前样或物理色卡为准。",
        "Notes / Description": "备注 / 描述",
        "Notice:": "注意事项：",
        "Nude Sponge": "海绵裸色",
        "ODM": "现有款式 (ODM)",
        "ODM / OBM + Standard Materials, Colors & Prints": "ODM / OBM + 常规面辅料、颜色/印花",
        "OEKO-TEX Eco-Dyeing": "OEKO-TEX 环保染色",
        "OEM": "自主设计 (OEM)",
        "OEM + Standard Materials, Colors & Prints": "OEM + 常规面辅料、颜色/印花",
        "OK": "确定",
        "One Color One Size": "独色独码",
        "One Size (OS)": "均码 (OS)",
        "Operation failed, please try again": "操作失败，请重试",
        "Operation failed, the link may be expired": "操作失败，请检查链接是否过期",
        "Optional, fill in if shipped...": "选填，若已寄出请填写...",
        "Order & Delivery": "下单交付",
        "Other": "其他",
        "Other Color": "其他颜色",
        "Other Custom Color": "其他定制色",
        "Other Custom Shape": "其他定制形状",
        "Other Region": "其他地区",
        "Other Trims:": "其他辅料:",
        "Outer Carton Packing Rules": "外箱装箱规则",
        "Packaging Bag": "包装袋",
        "Packaging Reference / Labeling Sample Photo": "包装参考 / 贴标样照",
        "Packaging:": "包装袋:",
        "Packing & Shipping Mark Details": "装箱与唛头细节描述",
        "Packing Requirement Description": "装箱与包装需求描述",
        "Padding": "胸垫",
        "Padding Color": "胸垫颜色",
        "Padding Configuration Mode": "胸垫配置模式",
        "Paper Thickness": "纸张厚度",
        "Partial Lining": "局部衬里",
        "Partial Lining Placement Description": "局部里料位置说明",
        "Party A": "甲方 (披露方 / Disclosing Party)",
        "Party B": "乙方 (接收方 / Receiving Party)",
        "Party B agrees to strictly keep confidential all design drafts, drawings, samples, brand info, tech packs, and unpublished business plans provided by Party A. Without Party A's explicit written permission, never disclose to any third party.": "乙方同意对甲方提供的所有设计稿、图纸、样衣、品牌信息、工艺单及尚未公开的商业计划严格保密。未经甲方明确书面许可，绝不向任何第三方（包括且不限于工厂外包商、竞争对手及公众媒体）透露。",
        "Password": "密码",
        "Password must be at least 8 characters": "密码长度至少需要 8 位",
        "Password reset successful! Redirecting to login...": "密码重置成功！即将跳转到登录页...",
        "Password should be at least 8 characters.": "密码长度建议不少于 8 位。",
        "Passwords do not match!": "两次输入的密码不一致！",
        "Pattern Making Fee:": "制版费：",
        "Pattern precisely printed on specific garment areas (e.g., chest), suitable for single graphics or specific panel designs.": "图案精准印在衣物的特定部位（如胸前），适合单图或特定裁片设计。",
        "Pattern repeats continuously on fabric, suitable for florals, camouflage, or geometric patterns.": "图案在面料上无限连续循环重复，适合碎花、迷彩或几何图案。",
        "pcs / sets": "件 / 套",
        "PDF / ZIP / Excel supported (Max 50MB)": "支持 PDF / ZIP / Excel (Max 50MB)",
        "Pending...": "待填写...",
        "Physical Swatch Archive": "实物色卡档案",
        "Placement Print": "定位定版印花",
        "Please describe print position and layout requirements in detail.": "请详细描述印刷位置与排版要求。",
        "Please describe print position and layout requirements in detail.\ne.g.: Logo centered on bag, width 1/3 of bag width; eco recycling mark at the bottom...": "请详细描述印刷位置与排版要求。\n例如：Logo 位于袋子正中心，宽度占袋宽 1/3；底部需印环保循环标识...",
        "Please describe size range, measurement requirements for each part, etc...": "请描述尺码范围、各部位尺寸要求等...",
        "Please describe the fabric texture and properties you need (e.g.: ice-silk feel, high elasticity, antibacterial, water-repellent, wrinkle texture, etc.)...": "请详细描述您需要的面料质感、特性（如：冰丝感、高弹、抗菌、防泼水、起皱肌理等）...",
        "Please describe your modification requirements or specific craft requirements in detail...": "请详细描述您的修改要求或特定工艺要求...",
        "Please describe your packing & carton requirements in detail.\nExamples:\n1. Individual bagging: OPP bag + hang tag attached\n2. Outer carton: one color one size, max 15kg per carton\n3. Side marks: SKU / Color / Size / Quantity\n4. Amazon FBA warehouse labels required": "请详细描述您的包装与装箱需求。\n例如：\n1. 单件入袋方式：独立 OPP 袋 + 吊牌外挂\n2. 外箱规则：独色独码，每箱不超过 15kg\n3. 侧唛需印：SKU / 颜色 / 尺码 / 数量\n4. 需贴 Amazon FBA 入仓标签",
        "Please describe your packing requirements in detail.\ne.g.:\n1. Outer cartons need Amazon FBA labels\n2. Each carton must not exceed 15kg\n3. Side marks should include tracking number and SKU info": "请详细描述您的装箱需求。\n例如：\n1. 外箱需贴 Amazon FBA 标签\n2. 每箱重量不得超过 15kg\n3. 侧唛需印制单号和 SKU 信息",
        "Please enter selected color number(s) (multiple allowed, separated by commas)": "请输入您选定的色号 (可多选，请用逗号隔开)",
        "Please provide size description or upload size files": "请提供尺寸说明或上传尺寸文件",
        "Please select country...": "请选择国家...",
        "Please select fabric material for each section. After selection, define colors or prints in the configuration panel below.": "请分别选择对应部位的面料材质。选中后在下方配置台中定义颜色或印花。",
        "Please specify the size, material, and craft for each main and sub tag.\ne.g., Main tag 5x8cm white cardboard with gold foil, sub tag 4x10cm translucent tracing paper with black printing...": "请明确指出主牌和副牌各自的尺寸、材质及工艺要求。\n例如：主牌5x8cm白卡纸烫金，副牌4x10cm半透明硫酸纸黑色印刷...",
        "Please understand your target country's mandatory care label regulations. Must include: Country of Origin, fiber composition percentages, and laundry care icons. The factory cannot be held responsible for customs detention caused by missing label information.": "请务必了解您的目标销售国对服装水洗标的强制性法规要求。通常必须包含：原产地、准确的纤维成分百分比及适用的洗涤护理图标。若因标签缺失必填信息导致海关扣留或市场处罚，工厂无法承担相关责任。",
        "Please upload style reference images or sketches": "请上传款式参考图或草图",
        "Port / FOB delivery": "港口/离岸交货",
        "Port of Loading": "离岸港口",
        "Position Reference Image": "位置参考图 (选填)",
        "PP Sample": "正确样",
        "PP Sample:": "正确样 (PP):",
        "Preferred Pattern Maker": "期望指定的打版师",
        "Preferred Sales Manager": "期望指定的业务经理",
        "Preferred Sample Courier": "首选样品快递",
        "Preferred Sample Team": "期望指定的样衣组",
        "Preview Image": "预览图",
        "Previous Step": "返回上一步",
        "Price Calculation Notice:": "价格核算说明：",
        "Print & Layout Instructions": "印刷与排版说明",
        "Print Content & Design": "印刷内容与设计",
        "Print Content & Layout Design": "印刷内容与排版设计",
        "Print Layout Requirements": "印刷排版要求",
        "Print Scale": "印花尺寸比例",
        "Print single-color Logo/warning text": "印制单色 Logo/警示语",
        "Printing Craft Add-on": "印刷工艺附加",
        "Processing...": "处理中...",
        "Product Details": "产品详情",
        "Production Scale Confirmation": "生产规模确认",
        "Professional Flatlock Stitch": "四针六线专业拼缝",
        "Project Basic Info": "项目基本信息",
        "Project Description": "项目描述",
        "Project/Collection Description": "项目/系列简要描述",
        "Project/Collection Name": "项目/系列名称",
        "Proto Sample": "初样",
        "Proto Sample:": "初样 (Proto):",
        "Push-up": "聚拢",
        "Quantity": "数量",
        "Quantity Guide": "数量说明",
        "Receiving Address:": "收件地址：",
        "Receiving Warehouse:": "收件仓库：",
        "Recipient: Material Distribution Dept +86 191-6891-9352": "收件人：物料核发部 +86 191-6891-9352",
        "Recipient: Mr. Liu +86 177-1101-4152": "收件人：刘先生 +86 +86 177-1101-4152",
        "Recipient: Trims Distribution Dept +86 191-6891-9352": "收件人：辅料核发部 +86 191-6891-9352",
        "Recommend M size (US 6-8) as sampling base size.": "建议选择 M 码 (US 6-8) 作为打样基准码。",
        "Recommended for children's wear, underwear, accessories": "童装、内衣、配饰推荐",
        "Recover Password": "找回密码",
        "Reference & Inspiration": "参考图与灵感",
        "Reference Attachments": "参考附件",
        "Reference Image Upload": "参考图上传 (选填)",
        "Reference Images or Tech Pack": "参考图样或工艺单 (选填)",
        "Reference Sample Photo Upload": "参考样照上传",
        "Register": "注 册",
        "Registered Email": "注册邮箱",
        "Remember your password? Login": "记起密码了？返回登录",
        "Reminder:": "提醒：",
        "Requirements / Notes": "需求描述 / 备注",
        "Requires die cutting (MOQ 10000+)": "需开刀模 (MOQ 10000起)",
        "Requires die cutting (MOQ 5000+)": "需开刀模 (MOQ 5000起)",
        "Reset": "重置",
        "Rose Gold": "玫瑰金",
        "Round corner edge processing": "边缘做圆角处理",
        "Same style & color bulk >300 pcs, basic sample fee fully refunded": "同款同色大货 >300件 基础打样费全额退还",
        "Sample fees are non-refundable once collected": "打样费一经收取概不退还",
        "Sample lead time: 7-10 business days.": "样板周期预计 7-10 个工作日。",
        "Sample Receiving Destination": "样品接收目的地",
        "Sample Shipping Configuration": "样品接收配置",
        "Sample Type": "样衣类型",
        "Sampling Development": "打样开发",
        "Sampling Fee Standard": "打样收费标准",
        "Sampling includes Proto and PP types, with modular transparent billing.": "打样分为初样和正确样两种，费用采用模块化透明计费。",
        "Sampling Specification Suggestions": "打样规格建议",
        "Sampling Specifications & Professional Advice": "打样规格与专业建议",
        "Sampling Stage Notice": "开发阶段说明",
        "Save Customization": "保存定制需求",
        "Save Draft": "暂存草稿",
        "Save draft failed: ": "暂存失败：",
        "Save draft failed. Please check your network.": "暂存失败，请检查网络",
        "Scroll to zoom · Drag to pan · Double-click to reset": "滚轮缩放 · 左键拖拽 · 双击重置",
        "Sea Freight": "海运 (经济型)",
        "Sea Freight Express": "海运快船",
        "Seamless Pattern Print": "无缝循环印花",
        "Select All": "一键全选",
        "Select delivery mode based on current progress. Accurate planning helps calculate the most precise landed cost.": "请根据当前进度选择交付模式。准确的规划有助于我们为您核算最精确的落地成本。",
        "Select File": "选择文件",
        "Select images or PDF documents": "选择图片或 PDF 说明文档",
        "Select Printing Method": "选择印花工艺类型",
        "Select styles in the list above to preview fees...": "请在上方清单中选择款式以预览费用...",
        "Select the required category, then fill details in the expanded panel below.": "请选择所需类别，选中后在下方展开的面板中填写具体要求。",
        "Selected Details": "定制详情",
        "Selected ODM Styles:": "已选 ODM 款式:",
        "Send physical garment for pattern making reference": "寄送实体样衣进行打版参考",
        "Send Reset Email": "发送重置邮件",
        "Service fee: special sourcing may incur additional procurement service fees and logistics surcharges.": "服务费用：特殊找样可能产生额外的采购服务费及物流溢价。",
        "Service period: estimated 3-7 business days, depending on material scarcity.": "服务周期：预计 3-7 个工作日，具体视物料稀缺程度而定。",
        "Set New Password": "设置新密码",
        "Set Password (min 8 chars)": "设置密码 (至少8位)",
        "Set Username": "设置用户名",
        "Sewing Fee:": "缝制费：",
        "Sewing Method": "缝制方式",
        "SF Express": "顺丰速运 (仅限国内)",
        "Shape & Size": "形状与规格",
        "Shape Adaptation:": "形状适配：",
        "Shape Reference Image Upload": "形状参考图上传",
        "Shell": "面料",
        "Shiny Gold": "亮金色",
        "Shiny Silver": "亮银色",
        "Shipping tracking number...": "寄件快递单号 (选填)...",
        "Shipping, Packing & Special Compliance": "运输、装箱与特殊合规需求",
        "Silk screen, matte, etc. special crafts": "丝印、磨砂等特殊工艺",
        "Since padding must strictly fit outer garment panels, the system defaults to binding cup type with your style.": "由于胸垫必须严格适配外部成衣裁片，系统已默认将杯型与您的款式绑定（如三角杯配三角垫，抹胸配圆垫等）。",
        "Since you haven't selected custom packaging, we will use Hongxiu standard unprinted frosted ziplock bags.": "由于您未选择定制包装，我们将统一使用红绣标准无印磨砂拉链袋。",
        "Size": "尺码 (选填/自填)",
        "Size & Quantity Details": "尺码及数量明细",
        "Size Description": "尺寸文字说明",
        "Size File Upload": "尺寸文件上传",
        "Size Grading:": "尺码放缩：",
        "Size Information": "尺寸信息",
        "Size Recommendation": "尺码建议",
        "Slim Type": "修长型",
        "Slimming, preferred for dresses/pants": "显瘦，裙装/裤装首选",
        "Smart Match Description:": "智能代配说明：",
        "Smooth surface, high color reproduction": "纸面光滑，色彩还原度高",
        "Smooth, bright white, most commonly used": "平滑高白，最常用材质",
        "Snap Button": "按扣",
        "So we can send you the PI quotation": "以便我们发送 PI 报价单",
        "Solid": "纯色",
        "Some styles exceed 2 samples, extra pieces will incur sewing fees.": "部分款式打样数量超过 2 件，超出部分将加收缝制费。",
        "Sourcing Notice": "找样特别说明",
        "Special dyeing needs dyeing factory, MOQ 3000 pairs": "特殊染色需送染厂，MOQ 3000 副起",
        "Special Material Requirements Description": "特殊材质需求描述",
        "Special paper, textured paper customization": "特种纸、触感纸等定制",
        "Special Sewing Requirements Description": "特殊缝制要求描述",
        "Special shaped mold cups/pads require a mold opening fee, bulk MOQ typically 3000 pairs/size.": "重新开发特殊形状的模杯/胸垫需支付开模费，且大货起订量 (MOQ) 通常为 3000 副/码 起。",
        "Special styles or complex crafts (e.g., rhinestones, printed labels) may incur extra fees": "如果款式特殊或需要在样衣上进行复杂工艺（如镶钻、印标等），视情况需要额外收费",
        "Special Trims Requirements Description": "特殊辅料需求描述",
        "Specific areas raised and glossy": "特定区域凸起发亮",
        "Specified special color dyeing, MOQ 5000 pcs": "指定特殊颜色染色，MOQ 为 5000 根起",
        "Spot UV": "局部 UV",
        "Square / Circle": "正方/圆形",
        "Standard (400g)": "标准型 (400g)",
        "Standard Bullet": "常规子弹头",
        "Standard Bullet Loop": "常规子弹头吊粒",
        "Standard ink printing": "常规油墨印刷",
        "Standard Process Reminder:": "常规工艺提醒：",
        "Standard Rectangle": "通用矩形",
        "Standard Regular": "常规标准",
        "Standard Square": "常规方块",
        "Standard Square Loop": "常规方块吊粒",
        "Sticker Material": "贴纸材质",
        "Strap End Decoration": "绑带末端装饰",
        "strict protection": "严格保护",
        "strict protection. Hongxiu promises never to disclose to any third party without authorization.": "严格保护，红绣承诺未经授权绝不外泄给任何第三方。",
        "Style Count": "包含款式数",
        "Style Definition": "款式定义",
        "Style Light Customization": "款式轻定制",
        "Style Reference Image": "样式参考图",
        "Style Type": "款式类型",
        "style(s)": "款",
        "Subject to minimum production requirements of dyeing factories and trim supply chains": "受限于面料染厂及辅料供应链的最低开机起订要求",
        "Success!": "操作成功！",
        "Supplementary shape notes / special shape requirements": "补充形状说明 / 异形要求",
        "Supplementary size notes / special shape requirements": "补充尺寸说明 / 异形要求",
        "Supplementary size notes / special shape requirements (Required)": "补充尺寸说明 / 异形要求 (必填)",
        "Supports AI, EPS, PDF, or high-resolution images above 300DPI": "支持 AI, EPS, PDF, 或 300DPI 以上高清图片",
        "Swim trunk main label standard location": "泳裤主标常规位",
        "System will calculate bulk production schedule based on total": "系统将基于此总数核算大货生产排期",
        "System will generate sampling list based on total above": "系统将根据以上总数生成打样清单",
        "T-Back / High-cut ultra-narrow crotch": "T-Back/高叉极窄裆部",
        "Target Component": "目标服装部件 (可多选)",
        "Target EXW Bulk Unit Price Range": "期望 EXW 大货单价范围",
        "Target EXW Unit Price": "期望 EXW 单价",
        "Tax-inclusive delivery to door": "包税派送到门",
        "Tech Pack / Design Draft": "工艺单/设计稿",
        "Text Content / Additional Notes": "文字内容 / 补充说明",
        "Thick Mounted (800g)": "加厚对裱 (800g)",
        "Thickness & Push-up Effect": "厚度与聚拢需求",
        "This is your expected bulk unit price. Since bulk pricing is affected by multiple dynamic factors, the system cannot provide a real-time fixed price. Final quotation confirmed through official PI after sales manager evaluation.": "此处填写的为您对大货单价的预期。由于大货报价受订单总数、面辅料实时市价、工艺复杂度及汇率等多种动态因素影响，系统目前无法给出实时一口价。最终准确的报价需经由业务经理完成详细成本核算后，以为您提供的正式 Proforma Invoice (PI) 账单为准。",
        "Thong Narrow Shape": "丁字裤窄形",
        "To ensure 100% accuracy in texture, weight and color, we strongly recommend sending physical fabric/garments for matching.": "为确保质感、克重及对色 100% 精准，强烈建议您寄送实物面料/样衣供我们对照匹配。",
        "To ensure maximum precision in bulk production, the following are the most critical and easily overlooked craft specifications in your custom design. Please verify your uploaded design drafts cover the following items, and check each one to proceed.": "为确保大货落地的极致精准度，以下为您自主设计中最关键且极易被遗漏的工艺指标。请务必核对您在上方上传的设计稿或补充说明中已涵盖以下内容，并逐一打勾确认方可进入下一步。",
        "Top / One-Piece Swimsuit": "上装 / 连体泳装",
        "Top Thin Bottom Thick": "上薄下厚",
        "Top/One-piece - Custom position description": "上装/连体 - 自定义位置描述",
        "Total Quantity": "总数量",
        "Tracking Number": "寄件单号",
        "Tracking Number:": "寄件单号 (选填)：",
        "Transparent": "透明",
        "Transparent PET": "透明 PET (标准)",
        "Underwire": "钢托",
        "United Kingdom": "英国",
        "Universal Gourd Shape": "通用葫芦形",
        "Upload Custom Print Design Original": "上传定制印花设计原稿",
        "Upload Fabric Description Files or Reference Images": "上传面料描述文件或参考图",
        "Upload Note: ": "上传对应提示：",
        "Upload Reference Files": "上传参考文件",
        "Upload reference images or requirements for Hongxiu to source/develop globally": "上传参考图或要求，由红绣为您全球找样/开发",
        "Upload reference images or tech packs": "上传参考图或工艺单",
        "Upload Reference Images or Technical Attachments": "上传参考图或工艺附件",
        "USA": "美国 (USA - FTC 要求)",
        "Use Customer Account": "使用客户账号 (到付)",
        "User Center": "用户中心",
        "Username or Email": "用户名或邮箱",
        "Uses correct bulk materials, fully replicates production effect": "使用正确面辅料，完整还原大货效果",
        "Uses substitute materials, for checking pattern, sizing and overall effect": "使用替代面辅料，仅供检查版型、尺寸及整体效果",
        "View Common Country Compliance Examples": "查看常见国家合规示例",
        "Vintage natural, eco-friendly style": "复古自然，环保风格",
        "Visually unique": "视觉独特",
        "Wash care label standard location": "水洗成分标常规位",
        "Wash label / fold label preferred": "水洗标/夹标首选",
        "When same style same color bulk order exceeds 300 pcs, basic sample fees will be fully refunded!": "当同款同色大货数量超过 300 件 时，基础打样费将全额退还！",
        "White": "白色",
        "White Cardboard": "白卡纸",
        "Width (cm)": "宽 (cm)",
        "Xingcheng Hongxiu Clothing Co., Ltd.": "兴城市红绣服饰有限公司",
        "Yes": "是",
        "Yes, please calculate unit price based on my bulk intent": "是的，请基于我的大货意向核算单价",
        "You provide design drafts/references for new pattern development, with standard market fabrics and universal trims.": "由您提供设计稿/参考图全新开版，搭配市场现货常规面料与通用辅料。",
        "Your customization requirements are mostly configured. Please leave your business contact and confirm the NDA. We will assign a dedicated team for follow-up.": "您的定制需求已基本配置完成。最后，请留下您的商业名片并确认保密条款，我们将为您分派专属团队进行后续对接。",
        "Your Name": "您的称呼",
        "Your name (e.g., Alex Wang)": "您的称呼 (如: Alex Wang)",
        "Zipper Head and Zipper": "拉链头及拉链"
    };

    // Dynamic content translations (JS-generated text)
    var jsDynamic = {
        "-- Select style --": "-- 请选择款式 --",
        "?": " 吗？",
        "(Customized)": "(已定制)",
        "[Custom mold]": "[异形开模]",
        "[Main/care label separated]": "[主洗标分开]",
        "[No HD color swatch archive]": "[ 暂无高清色卡档案 ]",
        "+ New Inquiry": "+ 新建询盘",
        "+Special requirements": "+特殊诉求",
        "× Pending": "× 待补内容",
        "⚠️ MOQ Reminder:": "⚠️ 起订量提醒：",
        "⚠️ Validation failed:\n\nYou submitted a custom design (OEM) request. Please check all items in the \"Core Specifications Checklist\".": "⚠️ 提交前置校验失败：\n\n您提交了自主设计 (OEM) 需求，为避免后期版型开发与大货生产出现工艺偏差，请务必逐一勾选确认「核心工艺与细节确认单」中的所有必填核对项。",
        "✅ Submitted successfully!": "✅ 提交成功！",
        "✅ Submitted successfully!\n\nYour request number: HX20240508001\nA dedicated account manager will provide a formal quote within 24 hours.": "✅ 提交成功！\n\n您的需求编号为: HX20240508001\n专属业务经理将在 24 小时内为您提供正式报价。",
        "✓ Uploaded": "✓ 已传稿/内容",
        "✨ Customized": "✨ 已定制",
        "① Style: Select at least one ODM style or upload one OEM design": "① 款式定义：请至少选择一个 ODM 款式或上传一个 OEM 设计",
        "1-Color Print": "单色印刷",
        "100% tagless, swimwear preferred": "100%无触感, 泳装首选",
        "② Fabric: Please select at least one fabric": "② 面料材质：请至少选择一种面料",
        "③ Trims: Enabled trims need to be configured": "③ 品牌辅料：已启用的辅料需完善配置",
        "④ Delivery: Please select at least one style in the table": "④ 下单交付：请在表格中至少选择一个款式",
        "⑤ Profile: Please fill in name, contact info, and brand name": "⑤ 客户档案：请填写姓名、联系方式和品牌名称",
        "A dedicated account manager will provide a formal quote within 24 hours.": "专属业务经理将在 24 小时内为您提供正式报价。",
        "Accessories pending": "待选择饰品",
        "Account Settings": "账户设置",
        "Adhesive Position Reference": "粘贴位置参考",
        "Adhesive Rules": "粘贴规则",
        "All-over Print": "满版印花",
        "Applied by factory": "工厂代贴",
        "approx.": "约",
        "Are you sure you want to delete inquiry ": "确定要删除询盘 ",
        "Are you sure you want to delete the draft?": "确定要删除草稿吗？",
        "At least 8 characters": "至少8位",
        "Auto-fit | Light and natural": "自动适配版型 | 轻薄自然",
        "Auto-match based on style": "根据款式自动匹配",
        "Back to Home": "返回主页",
        "Back to Inquiries": "返回询盘",
        "Back to List": "返回列表",
        "Basic Information": "基本信息",
        "Bikini": "比基尼",
        "Black": "黑色",
        "Blank without printing": "空白无印",
        "Board Shorts": "沙滩裤",
        "Bottom": "下装",
        "Bottom/Pants": "下装/裤装",
        "Brand Name": "品牌名称",
        "Bulk Destination": "大货目的地",
        "Bulk Details": "大货明细",
        "Bulk eval:": "评估大货:",
        "Bulk Logistics": "大货物流",
        "Bulk Order": "大货订单",
        "Bullet": "子弹头",
        "Can't find your fabric?": "找不到心仪面料？",
        "Center Back Neck": "领后中",
        "Center Back Waist": "后腰内中",
        "Center fold loop sew": "对折环缝",
        "Change failed": "修改失败",
        "Change Password": "修改密码",
        "Children": "儿童",
        "CIF": "CIF 到岸交货",
        "Classic brand feel, thick texture": "经典品牌感, 质感厚实",
        "Classic white card (350g/500g)": "经典白卡 (350g/500g)",
        "Clear all selected metal details?": "确定要清空下方已选择的所有金属明细吗？",
        "Clear all selections and start over?": "确定要清空所有已选配置并重头开始吗？",
        "Closed": "已关闭",
        "Coated Paper": "铜版纸",
        "Color": "颜色",
        "Color Blocking Notes": "拼色说明",
        "Color code pending": "待填色号",
        "Color Description": "色彩描述",
        "Color Requirement": "颜色要求",
        "Color:": "色号:",
        "Components": "部件",
        "Composition": "成分",
        "Comprehensive Tech Pack / Plan": "综合工艺单 / 企划书",
        "Compressing and uploading files...": "正在压缩并上传文件...",
        "Compressing images...": "正在压缩图片...",
        "Confirm and Submit": "确认并提交定制需求",
        "Confirm New Password": "确认新密码",
        "Contact Info": "联系方式",
        "Contact Information": "联系信息",
        "Contact Name": "联系人",
        "Content pending": "待补内容",
        "Content uploaded": "已传内容",
        "Content:": "内容:",
        "Continue Editing": "继续填写",
        "Copy as New Inquiry": "复制为新询盘",
        "Copy failed: data too large or storage unavailable": "复制失败：数据过大或存储不可用",
        "Cost reminder:": "成本提醒：",
        "Country pending": "待定国",
        "Courier:": "快递:",
        "Craft": "工艺",
        "Craft Description": "工艺说明",
        "Craft Reference": "工艺参考",
        "Current Password": "当前密码",
        "Custom": "自定义",
        "Custom Design": "自主设计",
        "Custom design (OEM)": "自主设计(OEM)",
        "Custom development / Global sourcing": "定制开发 / 全球找样",
        "Custom Die-cut Reference": "异形刀模参考",
        "Custom fabric": "自定义面料",
        "Custom material and shape": "定制材质与形状",
        "Custom other position": "自定义其他位置",
        "Custom sewing": "自定义缝制",
        "Custom shape": "异形定制",
        "Custom Shape": "异形",
        "Custom Shape Requirement": "异形要求",
        "Custom size": "自定义尺寸 (未输入)",
        "Custom size or special shape": "尺寸或特殊异形定制",
        "Custom sourcing / Development": "定制找样 / 开发",
        "Custom special sewing": "自定义特殊缝制",
        "Custom special trims": "定制特殊辅料",
        "Custom specifications": "自定义规格",
        "Customer account (collect)": "快递账号到付",
        "Customer Customized": "客户自定义",
        "Customer provides (CMT)": "客户自行提供物料 (CMT)",
        "Customer-supplied (CMT)": "客户自行提供 (CMT)",
        "Customer-supplied Fabric (CMT)": "客户自行提供面料 (CMT)",
        "Customer-supplied Fabric Files": "客供面料文件",
        "Customization Details": "轻定制详情",
        "Customized Separately": "分开定制",
        "DDP tax included": "DDP 双清包税",
        "DDP to door": "DDP 双清包税到门",
        "Dedicated Logo": "独立LOGO",
        "Delete Draft": "删除草稿",
        "Delete failed": "删除失败",
        "Delete failed: ": "删除失败：",
        "Delivery Information": "交付信息",
        "Delivery Mode": "交付模式",
        "Desc:": "描述:",
        "Description pending": "待写描述",
        "Description:": "描述：",
        "Deselect All": "取消全选",
        "Design Description": "设计描述",
        "Design Files": "设计文件",
        "Design uploaded": "已传设计图",
        "Design:": "设计稿:",
        "design(s)": "款设计",
        "Detail Description": "明细描述",
        "Dev / Sourcing": "开发/找样",
        "DHL/FedEx": "DHL/FedEx (红绣代办)",
        "Die-cut / Custom Shape Reference": "刀模/异形参考",
        "Draft does not exist or has expired": "草稿不存在或已过期",
        "e.g.,\nBlack body, contrast piping\nNote: waterproof zipper": "例：\n主体黑色，撞色滚边\n注意防水拉链",
        "e.g.,\nS: 20\nM: 50\nL: 30": "例：\nS: 20\nM: 50\nL: 30",
        "e.g., Black floral style": "例: 黑色碎花款",
        "e.g.: 2x5cm": "如: 2x5cm",
        "Email": "邮箱",
        "Enabled": "已开启 (待填写需求)",
        "Encrypting and dispatching to team...": "正在加密传输并分派团队...",
        "Enter current password": "输入当前密码",
        "Estimated Bulk Qty": "预估大货数量",
        "Existing style (ODM)": "现有款式(ODM)",
        "Export": "导出 PDF",
        "Export failed: ": "导出失败：",
        "EXW": "EXW 工厂交货",
        "Fabric Information": "面料信息",
        "Failed to fetch inquiry data: ": "获取询盘数据失败：",
        "Failed to get draft": "获取草稿失败",
        "Fastener": "吊粒",
        "Fastener:": "吊粒:",
        "file(s)": "附件",
        "Foam Nude": "海绵裸色",
        "FOB": "FOB 离岸交货",
        "For hoodies/pants/outerwear": "适合卫衣/长裤/外套",
        "For regular garments": "适配常规衣物",
        "For regular T-shirts/vests": "适合常规T恤/背心",
        "For underwear/swimwear/small accessories": "适合内衣/泳装/小配件",
        "Full Lining": "全衬里",
        "General Logo Files": "通用LOGO文件",
        "General Reference Files": "通用参考文件",
        "General Remark": "整体备注",
        "Generating...": "生成中...",
        "Gold/Silver Foil": "烫金/烫银",
        "Hang Tag": "吊牌",
        "Has description": "有需求描述",
        "Has supplementary notes": "有补充说明",
        "Heat transfer label": "印标",
        "Heat transfer labels recommended in single color. Multi-color designs cost more.": "无感印标建议设计为 单色 (黑色或白色)。如需彩色渐变或多色套印，开版费及单价较高。",
        "High stretch waterproof, skin-friendly": "高弹防水, 亲肤磨砂",
        "Hongxiu recommended": "红绣推荐",
        "Hongxiu smart matching": "红绣智能代配",
        "Hongxiu Standard": "红绣标配",
        "Hongxiu standard size": "红绣常规尺寸",
        "Hygiene Sticker": "卫生贴",
        "I. ": "一、 ",
        "II. ": "二、 ",
        "III. ": "三、 ",
        "image(s) /": "图 /",
        "img": "图",
        "Inquiry Created": "创建询盘",
        "Inquiry Records": "询盘记录",
        "Inquiry Response": "询盘回复",
        "Insert into side/neckline seam": "夹入侧缝/领缝",
        "item(s)": "项",
        "IV. ": "四、 ",
        "Keep at least one labeling position": "请至少保留一个打标部位",
        "Kraft Paper": "牛皮纸",
        "Label": "标签",
        "Label Placement Reference (Bottom)": "打标位置参考 (下)",
        "Label Placement Reference (Top)": "打标位置参考 (上)",
        "Last Updated": "最后更新",
        "Light Customization": "轻定制",
        "Lining": "里料",
        "Lining Placement": "衬里位置",
        "List:": "清单:",
        "Loading...": "加载中...",
        "Log Out": "退出",
        "Logo Customization": "LOGO定制",
        "Logo Files": "LOGO文件",
        "Logo Type": "LOGO类型",
        "Main & Sub tags": "子母牌",
        "Main Label & Care Label": "主标与洗水标",
        "Main/care label separated": "主洗标分开",
        "Match garment pattern": "匹配成衣版型",
        "Material": "材质",
        "Material not selected": "未选材质",
        "Men's Shorts": "男裤",
        "Mesh": "网纱",
        "Metal Hardware": "五金配件",
        "MOQ 5000 min.": "MOQ 5000起订",
        "Most popular": "常用",
        "Multi-Color Print": "彩色印刷",
        "Name not filled": "未填姓名",
        "NDA Signed": "NDA 签署",
        "Need Bulk Quote": "需大货报价",
        "Network error": "网络错误",
        "Network error, please retry": "网络错误，请重试",
        "Network error. Please check your connection and try again.": "网络异常，请检查网络后重试。",
        "New Password": "新密码",
        "New password must be at least 8 characters": "新密码至少需要8位",
        "New passwords do not match": "两次输入的新密码不一致",
        "No color selected": "未选择颜色",
        "No color swatches for this fabric.": "该面料暂未配置可选色卡。",
        "No fabric data available": "暂无面料数据",
        "No files selected": "未选择文件",
        "No HD swatch photos. Enter your color code or description directly.": "该面料暂未配置高清物理色卡照片，请直接填写您需要的色号或颜色描述。",
        "No inquiry records yet": "暂无询盘记录",
        "No preview available": "暂无预览图",
        "No print": "无印",
        "No style data available": "暂无款式数据",
        "No styles added to sample list...": "尚未添加任何款式到打样清单...",
        "No supplementary notes": "无补充说明",
        "No text description": "无文字描述",
        "Non-adhesive": "免粘贴",
        "None": "无附加工艺",
        "Not applied by factory": "不代贴",
        "Not selected": "未选",
        "ODM Styles": "ODM款式",
        "OEM Custom Design Package:": "OEM 自主设计包:",
        "One-piece": "连体",
        "Other": "其他",
        "Other Attachments": "其他附件",
        "Other color": "其他色",
        "Other Files": "其他文件",
        "Other position": "其他位置",
        "Other Reference": "其他参考",
        "Packaging Bag": "包装袋",
        "Packaging Reference Files": "包装参考文件",
        "Packaging Remark": "包装备注",
        "Packaging...": "打包中...",
        "Packing files uploaded": "已传包装要求图",
        "Padding": "胸垫",
        "Password changed successfully": "密码修改成功",
        "Pattern customization": "版型轻定制",
        "pcs": "件",
        "Pending": "待处理",
        "Pending description": "待补充说明",
        "PET | Gourd | Applied": "透明PET | 葫芦形 | 代贴标",
        "Physical Mail": "实物邮寄",
        "Physical sample shipped": "已寄送实体样衣",
        "Placement Print": "定位印花",
        "Please complete all required fields (*) in the business identity section.": "请完整填写商业身份档案中的必填项 (*)，以便我们能联系到您。",
        "Please complete the following required items before submitting:": "提交前请完善以下必填内容：",
        "Please read and agree to the NDA before submitting.": "提交前请阅读并勾选同意商业保密协议 (NDA)。",
        "Plus Size": "大码",
        "PP Sample": "正确样 (PP)",
        "Premium custom fabric": "精选定制面料",
        "Premium custom packaging": "优质定制包装",
        "Print": "印花",
        "Print Design": "印刷设计图",
        "Print Pattern": "印花图案",
        "Print Type": "印花类型",
        "Processing": "处理中",
        "Project Link": "项目链接",
        "Project Name": "项目名称",
        "Project Token": "项目 Token",
        "Proto Sample": "初样 (Proto)",
        "Qty": "数量",
        "Quantity pending": "数量待定",
        "Quick Pick": "快速选色",
        "Quoted": "已报价",
        "Re-enter new password": "再次输入新密码",
        "Recommended": "推荐",
        "Recommended by Hongxiu": "由红绣推荐",
        "Reference Attachments": "参考附件",
        "Reference Base Color": "参考底色",
        "Reference Files": "参考文件",
        "Remark": "备注",
        "Required": "需要",
        "Requirement Description": "需求描述",
        "Response": "回复内容",
        "Rounded Corners": "圆角",
        "Sample Destination": "样衣目的地",
        "Sample Details": "样衣明细",
        "Sample development only": "仅开发样衣",
        "Sample Logistics": "样衣物流",
        "Sample Order": "样衣订单",
        "Sample Shipping": "寄送样衣",
        "Sampling stage": "打样阶段",
        "Satin/special label custom": "缎面标/特种标定制",
        "Save Changes": "保存修改",
        "Scale Ratio": "缩放比例",
        "Sea Freight": "Sea Freight (海运快船)",
        "Seamless print": "无缝印花",
        "Select or type": "选或填",
        "Select vector file": "选择矢量文件",
        "Selected Styles": "已选款式",
        "Send physical sample": "寄送实体样衣",
        "Separation Description": "分开说明",
        "Sewing Description": "缝制说明",
        "Sewing Method": "缝制方式",
        "Sewing Method Reference": "缝制方式参考",
        "Sewing pending": "缝制待说明",
        "SF Express": "国内顺丰",
        "Shape": "形状",
        "Shape Description": "形状说明",
        "Shape Reference": "形状参考",
        "Shiny Gold": "亮金色",
        "Shipping Method": "物流方式",
        "Shipping Tracking #": "寄件单号",
        "Single side flat stitch": "单边平缝",
        "Size": "尺寸",
        "Size Allocation": "尺码分配",
        "Size and sewing details in description": "尺寸与缝制详见描述",
        "Size not selected": "未选尺寸",
        "Size pending": "尺寸待定",
        "Size:": "尺寸:",
        "Slim Type": "标准修长型",
        "Solid": "纯色",
        "Sorry, no HD preview for this item.": "抱歉，该项目暂无高清预览图。",
        "Spot UV": "局部UV",
        "Square": "方块",
        "Standard (5-8mm)": "常规标准 (5-8mm)",
        "Standard plastic fastener": "通用塑料吊粒",
        "Standard Rectangle": "标准矩形",
        "Standard Rectangle (approx. 5x8cm)": "标准矩形 (约 5x8cm)",
        "Standard slim (approx. 4x9cm)": "标准修长型 (约 4x9cm)",
        "Standard square loop": "常规方块吊粒",
        "Stitch around or single edge": "四周或单边车线",
        "String": "吊绳",
        "String Color": "绳色",
        "String Reference": "吊绳参考",
        "Style": "款式",
        "Style Count": "款式数量",
        "Style Descriptions": "款式描述",
        "Style Information": "款式信息",
        "Style Reference": "样式参考",
        "Sub-tag": "副牌",
        "Submission failed. Please try again later.": "提交失败，请稍后重试。",
        "Submitting...": "提交中...",
        "Surface Finish": "表面处理",
        "Tagless heat transfer": "无感烫印标",
        "Target": "目标",
        "Target EXW Unit Price": "期望EXW单价",
        "Target Price": "目标价格",
        "TBD": "待定",
        "Text-only description": "仅文字需求说明",
        "Thickness": "厚度",
        "Timeline": "时间线",
        "Top": "上装",
        "Top/One-piece": "上装/连体",
        "Total": "共",
        "TPU label": "TPU标",
        "TPU labels recommended in standard black. Special colors require higher MOQ and cost.": "TPU 柔感标建议选择 常规黑色。如需指定特殊底色或彩色字，需满足较高的起订量 (MOQ) 且成本较高。",
        "Tracking # pending": "待更新物流单号",
        "Tracking #:": "单号:",
        "Tracking pending": "待更新单号",
        "Trade Terms": "贸易术语",
        "Transport Method": "运输方式",
        "Trims / Packaging": "辅料 / 包装",
        "Two-piece": "分体",
        "Type": "类型",
        "Unknown error": "未知错误",
        "Unnamed brand": "未命名品牌",
        "Uploaded:": "已传:",
        "Uploading files...": "正在上传文件...",
        "Username": "用户名",
        "View details": "查看详情",
        "View images": "查看图片",
        "Website": "网站",
        "Weight (GSM)": "克重",
        "White": "白色",
        "White Cardboard": "白卡纸",
        "Woven label": "织唛标",
        "You have an unfinished inquiry draft": "有一份未完成的询盘草稿",
        "Your inquiry number:": "您的需求编号为:"
    };

    // Fragment translations for partial string replacement
    var fragments = {
        " (Custom)": "（定制色）",
        " (Tracking #: ": "（单号：",
        " attachment(s)": " 个附件",
        " comprehensive attachment(s)": " 个综合附件",
        " designs": " 款设计",
        " exceeds 20MB": " 超过 20MB",
        " exceeds 50MB limit": " 超过 50MB 限制",
        " file(s)": " 个文件",
        " items / total": "项 / 共",
        " pcs": " 件",
        " pcs | Courier: ": "件 | 快递: ",
        " pcs.\n\nSystem has auto-adjusted to minimum.": " 件。\n\n系统已自动为您调整为最低起订量。",
        " photo(s)": " 张",
        " style(s)": " 款",
        ", minimum order quantity per style is ": "，该类型单款最低起订量为 ",
        ": Custom Development / Global Sourcing": "：定制开发/全球找样",
        "?": " 吗？",
        "): ": ")：",
        "]?": "] 的选择吗？",
        "● Physical sample shipped": "● 已寄送实体样衣",
        "⚠️ MOQ Reminder:\nYou selected ": "⚠️ 起订量提醒：\n您选择的是 ",
        "Bulk": "大货",
        "Bulk eval: ": "评估大货: ",
        "Clear selections for [": "确定要清空 [",
        "Color ref: ": "对色: ",
        "Color: ": "色号: ",
        "Configure: ": "配置：",
        "Delete failed: ": "删除失败：",
        "Delete inquiry ": "确定要删除询盘 ",
        "Desc: ": "描述: ",
        "Design: ": "设计稿: ",
        "Failed to fetch inquiry data: ": "获取询盘数据失败：",
        "File ": "文件 ",
        "List: ": "清单: ",
        "Load failed: ": "加载失败：",
        "No": "否",
        "OEM - Style ": "OEM-第 ",
        "Other Custom Color": "其他定制色",
        "Partial lining: ": "局部衬里: ",
        "Position (": "位置 (",
        "Print file ": "印花文件 ",
        "Sample": "样衣",
        "Saved at ": "保存于 ",
        "Scale: ": "尺寸: ",
        "Selected ": "已选 ",
        "Selected colors (": "已选色号 (",
        "Signed ": "已签署 ",
        "Status: ": "内容状态: ",
        "Style ": "款 ",
        "Successfully added ": "已成功添加 ",
        "Target $": "目标 $",
        "Total ": "共 ",
        "Tracking #: ": "单号：",
        "Tracking: ": "单号: ",
        "Yes": "是"
    };

    // Rich text translations (elements with inline HTML)
    var richDict = [
        { m: 'Upload Tip: If you submitted m', h: '<strong>上传对应提示：</strong>若申报了多款设计，请确保下方上传的<strong>参考图文件名</strong>或<strong>工艺单页码</strong>能与 A 区域填写的“款 1、款 2...”描述清晰对应。' },
        { m: 'Shipping Address: Hongxiu Clot', h: '<strong>收件地址：</strong>中国辽宁省兴城市铁西路10-8A红绣服饰有限公司 (收件人：刘先生 +86 177-1101-4152)' },
        { m: 'To ensure ultimate precision i', h: '为确保大货落地的极致精准度，以下为您自主设计中<strong>最关键且极易被遗漏的工艺指标</strong>。请务必核对您在上方上传的设计稿或补充说明中已涵盖以下内容，并<strong style="color: #ef4444;">逐一打勾确认</strong>方可进入下一步。' },
        { m: 'Fabric Sourcing Note:• Lead ti', h: '<strong>找样特别说明：</strong><br>\n                                        • 服务周期：预计 <strong>3-7 个工作日</strong>，具体视物料稀缺程度而定。<br>\n                                        • 服务费用：特殊找样可能产生额外的采购服务费及物流溢价。<br>\n                                        • <strong>核心建议：</strong>为确保质感、克重及对色 100% 精准，强烈建议您寄送<strong>实物面料/样衣</strong>供我们对照匹配。' },
        { m: 'Standard Process Reminder: As ', h: '<strong>常规工艺提醒：</strong>作为贴身且不外露的内衬，行业默认使用 <strong>黑色或白色</strong>。若您指定定染特殊颜色（如撞色里布），大货起订量 (MOQ) 将大幅提升，且可能产生额外费用。' },
        { m: 'If you have no concept of the ', h: '如果您对尺寸没有概念，请在上方区域上传一张<strong>成衣效果图 (Mockup)</strong>。通过图片展示印花在泳装上的比例位置，版师将据此为您精准还原。' },
        { m: 'Receiving Warehouse: Hongxiu C', h: '<strong>收件仓库：</strong>辽宁省兴城市铁西路10-8A红绣服饰有限公司 物料仓 (收件人：物料核发部 +86 191-6891-9352)' },
        { m: 'Development Stage Note:All bra', h: '<strong style="color: #475569;">开发阶段说明：</strong><br>\n                                本步骤配置的所有品牌辅料主要用于<strong>大货生产的成本核算与规划</strong>。打样阶段将优先使用工厂通用辅料，暂不受此配置影响。需注意，涉及 Logo 开模或定制印刷的辅料因受最低起订量 (MOQ) 限制，通常<strong>不会在打样环节单独落实</strong>。' },
        { m: 'Receiving Warehouse: Hongxiu C', h: '<strong>收件仓：</strong>辽宁省兴城市铁西路10-8A红绣服饰有限公司 物料仓<br><strong>收件人：</strong>辅料核发部 +86 191-6891-9352' },
        { m: 'Smart Match Description: No ne', h: '<strong style="color:var(--primary-color);">智能代配说明：</strong>您无需逐一挑选基础五金。版师将根据您的款式结构，自动匹配防锈防氯的高品质标准件（如常规 8 字扣、O 环、背扣等），确保颜色与上方所选完全一致。' },
        { m: 'Smart Match Description: Based', h: '<strong style="color:var(--primary-color);">智能代配说明：</strong>我们将根据您在 Step 1 中确定的款式轮廓，为您自动匹配**最契合的胸垫形状、厚度（默认轻薄自然）及颜色（默认肤色/黑色）**。确保穿着体验与成衣版型完美融合，您无需进行任何额外设置。' },
        { m: 'Hongxiu Expert Advice:1. Shape', h: '<strong>红绣专业建议：</strong><br>\n                                                    1. <strong>形状适配：</strong> 由于胸垫必须严格适配外部成衣裁片，系统已默认将杯型与您的款式绑定（如三角杯配三角垫，抹胸配圆垫等）。<br>\n                                                    2. <strong>尺码放缩：</strong> 我们将在大货生产中，<strong>根据成衣的不同尺码 (如 S, M, L, XL)，自动为您放缩并匹配对应大小的胸垫</strong>，确保每件衣物呈现完美的穿着比例。除非您有特殊的开模定制需求，否则建议交由我们自动匹配。' },
        { m: 'Commercial Note: Developing cu', h: '<strong style="color: #b45309;">商业提示：</strong>重新开发特殊形状的模杯/胸垫需支付开模费，且大货起订量 (MOQ) 通常为 <strong>3000 副/码</strong> 起。' },
        { m: 'Reminder: Special dyeing requi', h: '<strong>提醒：</strong>特殊染色需送染厂，MOQ <strong>3000 副起</strong>' },
        { m: 'Default Packaging: Since you d', h: '<strong>默认包装方案：</strong>由于您未选择定制包装，我们将统一使用<strong>红绣标准无印磨砂拉链袋</strong>。' },
        { m: 'Smart Auto-Match: We will matc', h: '<strong style="color:var(--primary-color);">智能代配说明：</strong>我们将为您匹配最畅销的<strong>经典白卡纸+标准矩形尺寸+白色/黑色通用吊粒</strong>。您只需在下方上传 Logo 或设计稿，剩下的材质选择与工艺匹配将由红绣视觉团队为您代劳。' },
        { m: 'Commercial Note: Custom shapes', h: '<strong style="color: #b45309;">商业提示：</strong>定制特殊形状（如开模 Logo 吊粒）或特殊材质，起订量 (MOQ) 通常为 <strong>5000 套起</strong>。' },
        { m: 'Reminder: Custom color dyeing ', h: '<strong>提醒：</strong>指定特殊颜色染色，MOQ 为 <strong>5000 根起</strong>' },
        { m: 'Smart Auto-Match: We will defa', h: '<strong style="color:var(--primary-color);">智能代配说明：</strong>我们将为您默认匹配最舒适的<strong>无感烫印标</strong>，并印制于<strong>领后中</strong>位置。您只需在下方提供需印制的文字内容或设计稿，其余合规排版由红绣视觉团队代劳。' },
        { m: 'Regulatory Compliance Reminder', h: '<strong>法规与合规性提醒：</strong><br>\n                                                请务必了解您的目标销售国对服装水洗标的强制性法规要求。通常必须包含：<strong>原产地</strong>、准确的<strong>纤维成分百分比</strong>及适用的<strong>洗涤护理图标</strong>。若因标签缺失必填信息导致海关扣留或市场处罚，工厂无法承担相关责任。' },
        { m: 'Smart Auto-Match: We will conf', h: '<strong style="color:var(--primary-color);">智能代配说明：</strong>我们将为您默认配置最畅销的 <strong>“透明 PET 材质 + 通用葫芦形”</strong> 卫生贴，并印制国际标准的英文安全提示语。出货前，我们会<strong>免费为您贴于底裤裆部</strong>。您无需进行任何额外配置。' },
        { m: 'We recommend selecting Size M ', h: '建议选择 <strong>M 码 (US 6-8)</strong> 作为打样基准码。<br><br>\n                                                如果您需要核对放码比例，建议在正确样阶段增加一个最大或最小码。' },
        { m: 'Fee Notice: International samp', h: '<strong style="color: #475569;">费用说明：</strong> 样品国际运费需由客户自理。由于样品重量及包裹体积不确定，具体运费需待我们获取您的<strong style="color: var(--primary-color);">详细收货地址</strong>并完成打包核算后，方可为您提供最终物流报价。' },
        { m: 'Price Calculation Notice: This', h: '<strong style="color: #64748b;">价格核算说明：</strong> \n                                                        此处填写的为您对大货单价的预期。由于大货报价受<strong style="color:#475569;">订单总数、面辅料实时市价、工艺复杂度及汇率</strong>等多种动态因素影响，系统目前无法给出实时一口价。最终准确的报价需经由业务经理完成详细成本核算后，以为您提供的正式 <strong>Proforma Invoice (PI)</strong> 账单为准。' },
        { m: 'Core Principle: All MOQs below', h: '<strong style="color: #475569;">核心原则：</strong> 以下所有起订量（MOQ）均指 <strong>“单款单色 (Per Style, Per Color)”</strong>。同一颜色内，尺码可按您的需求配比混合装箱。' },
        { m: 'Must use ISO/GINETEX standard ', h: '必须使用 <strong>ISO/GINETEX 体系标准的洗水符号</strong> (通常5个基本符号按顺序排列：洗涤、漂白、干燥、熨烫、专业纺织品维护)。' },
        { m: 'Including: custom Pantone dyei', h: '包含且不限于：面料定染指定 Pantone 色、特殊肌理面料找样、品牌专属五金开模等。<strong>(受限于面料染厂及辅料供应链的最低开机起订要求)</strong>' },
        { m: '⚠️ Notice: Some styles exceed ', h: '<strong>⚠️ 提示：</strong>部分款式打样数量超过 2 件，超出部分将加收缝制费。' },
        { m: 'Packing Instructions: Please d', h: '<strong>装箱包装说明：</strong>请在下方描述您对单件包装、外箱装箱、唛头贴标等方面的要求。<br>\n                                                常见需求如：独立 OPP 袋封装、Amazon FBA 标签、每箱限重、混色混码规则等。如无特殊要求，工厂将使用行业标准方案。' },
        { m: 'I. Proto Sample ($40 / style)', h: '一、 初样（<span style="color: var(--primary-color); font-weight: 700;">$40 / 款</span>）' },
        { m: 'II. PP Sample ($50 / style)', h: '二、 正确样（<span style="color: var(--primary-color); font-weight: 700;">$50 / 款</span>）' },
        { m: 'Each style includes 1 sample b', h: '每款打样默认包含 <strong>1 件</strong>样衣，可额外免费制作 1 件（即每款最多免费 <strong style="color: var(--primary-color);">2 件</strong>）；超过 2 件的部分，每件加收相应缝制费' },
        { m: 'Each style includes 1 sample, ', h: '每款默认包含 <strong>1 件</strong>，可免费加做 1 件（最多 <strong style="color:var(--primary-color);">2 件免费</strong>）。<br><br>\n                                                超过 2 件的部分，每件加收相应缝制费。' },
        { m: 'Bulk Refund Plan: When same st', h: '<strong>大货退还计划：</strong> 当同款同色大货数量超过 <strong>300 件</strong> 时，基础打样费将全额退还！' },
        { m: 'Fabric Sourcing Note:\\u2022 Le', h: '<strong>找样特别说明：</strong><br>\n                                        • 服务周期：预计 <strong>3-7 个工作日</strong>，具体视物料稀缺程度而定。<br>\n                                        • 服务费用：特殊找样可能产生额外的采购服务费及物流溢价。<br>\n                                        • <strong>核心建议：</strong>为确保质感、克重及对色 100% 精准，强烈建议您寄送<strong>实物面料/样衣</strong>供我们对照匹配。' },
        { m: '\\u26a0\\ufe0f Notice: Some styl', h: '<strong>⚠️ 提示：</strong>部分款式打样数量超过 2 件，超出部分将加收缝制费。' }
    ];

    // ==================== Engine ====================

    // Merge jsDynamic into dict
    for (var k in jsDynamic) {
        if (jsDynamic.hasOwnProperty(k) && !dict[k]) {
            dict[k] = jsDynamic[k];
        }
    }

    // Pre-sorted keys for partial matching (longest first)
    var _sortedKeys = null;
    function getSortedKeys() {
        if (_sortedKeys) return _sortedKeys;
        var allKeys = {};
        var k;
        for (k in dict) { if (dict.hasOwnProperty(k)) allKeys[k] = dict[k]; }
        for (k in fragments) { if (fragments.hasOwnProperty(k)) allKeys[k] = fragments[k]; }
        _sortedKeys = Object.keys(allKeys).sort(function(a, b) { return b.length - a.length; });
        _sortedKeys._map = allKeys;
        return _sortedKeys;
    }

    // Build a Set of exact dict keys for fast lookup
    var _dictKeySet = null;
    function getDictKeySet() {
        if (_dictKeySet) return _dictKeySet;
        _dictKeySet = new Set(Object.keys(dict));
        return _dictKeySet;
    }

    /**
     * Translate an English string to Chinese.
     * Supports exact match and partial replacement.
     */
    function _t(text) {
        if (LANG === 'en' || !text) return text;
        // Exact match
        if (dict[text]) return dict[text];
        var trimmed = text.trim();
        if (dict[trimmed]) return dict[trimmed];

        // Partial replacement for strings containing known English phrases
        var keys = getSortedKeys();
        var map = keys._map;
        var result = text;
        var changed = false;
        for (var i = 0; i < keys.length; i++) {
            if (result.indexOf(keys[i]) !== -1) {
                result = result.split(keys[i]).join(map[keys[i]]);
                changed = true;
            }
        }
        return changed ? result : text;
    }

    /**
     * Translate elements containing inline HTML (<strong>, <span>, etc.)
     */
    function translateRichElements(root) {
        if (LANG === 'en' || richDict.length === 0) return;
        root = root || document.body;
        var els = Array.prototype.slice.call(root.querySelectorAll('div, span, p, li, td, label, h5'));
        els.reverse();
        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            if (el.getAttribute('data-i18n-done')) continue;
            if (el.querySelector('[data-i18n-done]')) continue;
            var tag = el.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') continue;
            var hasInline = false;
            for (var c = 0; c < el.children.length; c++) {
                var ct = el.children[c].tagName;
                if (ct === 'STRONG' || ct === 'SPAN' || ct === 'EM' || ct === 'B') {
                    hasInline = true;
                    break;
                }
            }
            if (!hasInline) continue;
            var tc = el.textContent;
            if (!tc) continue;
            var norm = tc.replace(/\s+/g, ' ').trim();
            for (var j = 0; j < richDict.length; j++) {
                if (norm.indexOf(richDict[j].m) !== -1) {
                    el.innerHTML = richDict[j].h;
                    el.setAttribute('data-i18n-done', '1');
                    break;
                }
            }
        }
    }

    /**
     * Walk all text nodes and replace English text with Chinese.
     */
    function translateDOM(root) {
        if (LANG === 'en') return;
        root = root || document.body;

        // First pass: rich elements with inline HTML
        translateRichElements(root);

        // Second pass: individual text nodes
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        var node;
        var replacements = [];
        var keySet = getDictKeySet();

        while (node = walker.nextNode()) {
            var text = node.nodeValue;
            if (!text || !text.trim()) continue;
            var parent = node.parentNode;
            if (!parent) continue;
            var ptag = parent.tagName;
            if (ptag === 'SCRIPT' || ptag === 'STYLE' || ptag === 'TEXTAREA') continue;

            var trimmed = text.trim();

            // Exact match (most common case)
            if (dict[trimmed]) {
                var leading = text.match(/^\s*/)[0];
                var trailing = text.match(/\s*$/)[0];
                replacements.push({ node: node, value: leading + dict[trimmed] + trailing });
                continue;
            }

            // Partial replacement: check if text contains any known key
            var newText = text;
            var changed = false;
            var sortedKeys = getSortedKeys();
            var map = sortedKeys._map;
            for (var i = 0; i < sortedKeys.length; i++) {
                if (newText.indexOf(sortedKeys[i]) !== -1) {
                    newText = newText.split(sortedKeys[i]).join(map[sortedKeys[i]]);
                    changed = true;
                }
            }
            if (changed) {
                replacements.push({ node: node, value: newText });
            }
        }

        for (var r = 0; r < replacements.length; r++) {
            replacements[r].node.nodeValue = replacements[r].value;
        }

        // Translate placeholder, title, and alt attributes
        var elements = root.querySelectorAll('[placeholder], [title], [alt]');
        for (var e = 0; e < elements.length; e++) {
            var el = elements[e];
            ['placeholder', 'title', 'alt'].forEach(function(attr) {
                var val = el.getAttribute(attr);
                if (val) {
                    var translated = _t(val);
                    if (translated !== val) {
                        el.setAttribute(attr, translated);
                    }
                }
            });
        }

        // Translate <option> text
        var options = root.querySelectorAll('option');
        for (var o = 0; o < options.length; o++) {
            var optText = options[o].textContent.trim();
            if (dict[optText]) {
                options[o].textContent = dict[optText];
            }
        }
    }

    /**
     * MutationObserver for dynamically inserted content
     */
    function observeDOM() {
        if (LANG === 'en') return;
        var pendingNodes = [];
        var translateTimer = null;

        var observer = new MutationObserver(function (mutations) {
            var hasNew = false;
            for (var i = 0; i < mutations.length; i++) {
                var mutation = mutations[i];
                if (mutation.addedNodes.length > 0) {
                    for (var j = 0; j < mutation.addedNodes.length; j++) {
                        var added = mutation.addedNodes[j];
                        if (added.nodeType === Node.ELEMENT_NODE) {
                            pendingNodes.push(added);
                            hasNew = true;
                        } else if (added.nodeType === Node.TEXT_NODE) {
                            var val = added.nodeValue;
                            if (val && val.trim()) {
                                var translated = _t(val.trim());
                                if (translated !== val.trim()) {
                                    var lead = val.match(/^\s*/)[0];
                                    var trail = val.match(/\s*$/)[0];
                                    added.nodeValue = lead + translated + trail;
                                }
                            }
                        }
                    }
                }
                if (mutation.type === 'characterData') {
                    var target = mutation.target;
                    if (target.nodeType === Node.TEXT_NODE && target.parentNode) {
                        var pTag = target.parentNode.tagName;
                        if (pTag !== 'SCRIPT' && pTag !== 'STYLE' && pTag !== 'TEXTAREA') {
                            var tv = target.nodeValue;
                            if (tv && tv.trim()) {
                                var tr = _t(tv.trim());
                                if (tr !== tv.trim()) {
                                    var ld = tv.match(/^\s*/)[0];
                                    var tl = tv.match(/\s*$/)[0];
                                    target.nodeValue = ld + tr + tl;
                                }
                            }
                        }
                    }
                }
            }
            if (hasNew && !translateTimer) {
                translateTimer = setTimeout(function () {
                    var nodes = pendingNodes.slice();
                    pendingNodes = [];
                    translateTimer = null;
                    for (var n = 0; n < nodes.length; n++) {
                        translateDOM(nodes[n]);
                    }
                }, 50);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    // ==================== Language Toggle ====================
    function setLanguage(lng) {
        fetch('/api/set-language', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lng: lng })
        }).then(function () {
            window.location.reload();
        });
    }

    // ==================== Init ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            translateDOM();
            _revealPage();
            observeDOM();
        });
    } else {
        translateDOM();
        _revealPage();
        observeDOM();
    }

    window.addEventListener('load', function () {
        setTimeout(function () { translateDOM(); }, 300);
        setTimeout(function () { translateDOM(); }, 1000);
    });

    // Tagged template for strings with dynamic parts (compat stub)
    function _tf(strings) {
        var values = Array.prototype.slice.call(arguments, 1);
        var full = '';
        for (var i = 0; i < strings.length; i++) {
            full += strings[i];
            if (i < values.length) full += values[i];
        }
        return _t(full);
    }

    // Expose globals
    window._t = _t;
    window._tf = _tf;
    window.translateDOM = translateDOM;
    window.setLanguage = setLanguage;
    window.__i18nDict = dict;
})();
