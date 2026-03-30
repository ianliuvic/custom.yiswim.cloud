/**
 * Client-side i18n translation engine
 * DOM text replacement approach: walks text nodes and replaces Chinese → English
 */
(function () {
    'use strict';

    // Current language - injected by EJS template
    var LANG = window.__lang || 'zh';

    // ==================== Chinese → English dictionary ====================
    var dict = {
        // ── Header ──
        "当前用户：": "Current User: ",
        "安全退出": "Log Out",

        // ── Stepper ──
        "款式定义": "Style Definition",
        "面料材质": "Fabric Material",
        "品牌辅料": "Brand Trims",
        "物流交付": "Logistics & Delivery",
        "需求汇总": "Requirements Summary",

        // ── Step 1 ──
        "请选择定制模式：从现有库中挑选 (ODM) 或 上传自主设计包 (OEM)，支持同时选择/上传多款。": "Choose your customization mode: select from our library (ODM) or upload your own design package (OEM). Multiple styles supported.",
        "现有款式 (ODM)": "Existing Styles (ODM)",
        "自主设计 (OEM)": "Custom Design (OEM)",
        "仅清空当前模式的选择": "Clear current mode selections only",
        "清空当前选择": "Clear Current Selection",
        "正在加载款式数据...": "Loading style data...",
        "项目基本信息": "Project Basic Info",
        "项目/系列名称": "Project/Collection Name",
        "例如: 2026 Summer Neon Series": "E.g., 2026 Summer Neon Series",
        "包含款式数": "Style Count",
        "款": "style(s)",
        "简要标识": "Brief identifier",
        "上传对应提示：": "Upload Note: ",
        "若申报了多款设计，请确保下方上传的参考图文件名或工艺单页码能与 A 区域填写的\u201c款 1、款 2...\u201d描述清晰对应。": "If you've declared multiple designs, please ensure the uploaded reference image filenames or tech pack page numbers clearly correspond to the \"Style 1, Style 2...\" descriptions in Section A.",
        "参考图与灵感": "Reference & Inspiration",
        "请上传款式参考图或草图 (仅限图片)": "Please upload style reference images or sketches",
        "拖拽或点击上传图片": "Drag or click to upload images",
        "工艺单/设计稿": "Tech Pack / Design Draft",
        "支持图片、PDF、AI、EPS 等格式": "Supports images, PDF, AI, EPS formats",
        "支持图片、PDF、AI (Max 20MB)": "Images, PDF, AI supported (Max 20MB)",
        "支持 AI / PDF / 图片格式 (Max 20MB)": "AI / PDF / Image formats supported (Max 20MB)",
        "拖拽或点击上传工艺文件": "Drag or click to upload tech files",
        "补充说明": "Additional Notes",
        "请详细描述您的修改要求或特定工艺要求...": "Please describe your modification requirements or specific craft requirements in detail...",
        "寄送实体样衣进行打版参考": "Send physical garment for pattern making reference",
        "收件地址：": "Receiving Address:",
        "中国辽宁省兴城市铁西路10-8A红绣服饰有限公司": "Hongxiu Clothing Co., Ltd, 10-8A Tiexi Road, Xingcheng, Liaoning, China",
        "收件人：刘先生 177-1101-4152": "Recipient: Mr. Liu 177-1101-4152",
        "寄件单号 (选填)：": "Tracking Number:",
        "若已寄出请填写；若尚未寄出，可稍后告知业务经理": "Fill in if shipped; if not yet shipped, inform sales manager later",
        "核心工艺与细节确认单": "Critical Specifications Checklist",
        "为确保大货落地的极致精准度，以下为您自主设计中最关键且极易被遗漏的工艺指标。请务必核对您在上方上传的设计稿或补充说明中已涵盖以下内容，并逐一打勾确认方可进入下一步。": "To ensure maximum precision in bulk production, the following are the most critical and easily overlooked craft specifications in your custom design. Please verify your uploaded design drafts cover the following items, and check each one to proceed.",
        "一键全选": "Select All",
        "正在加载必填核对单...": "Loading required checklist...",
        "所有设计均受": "All designs are protected by",
        "保密协议 (NDA)": "Non-Disclosure Agreement (NDA)",
        "严格保护": "strict protection",

        // ── Step 2 ──
        "请分别选择对应部位的面料材质。选中后在下方配置台中定义颜色或印花。": "Please select fabric material for each section. After selection, define colors or prints in the configuration panel below.",
        "正在加载面料数据...": "Loading fabric data...",
        "仅清空当前面料分类的选择": "Clear current fabric category selections only",
        "清空当前分类": "Clear Current Category",
        "配置选项": "Configuration Options",
        "面料": "Fabric",
        "找样特别说明": "Sourcing Notice",
        "服务周期：预计 3-7 个工作日，具体视物料稀缺程度而定。": "Service period: estimated 3-7 business days, depending on material scarcity.",
        "服务费用：特殊找样可能产生额外的采购服务费及物流溢价。": "Service fee: special sourcing may incur additional procurement service fees and logistics surcharges.",
        "核心建议：": "Key Suggestion:",
        "为确保质感、克重及对色 100% 精准，强烈建议您寄送实物面料/样衣供我们对照匹配。": "To ensure 100% accuracy in texture, weight and color, we strongly recommend sending physical fabric/garments for matching.",
        "面料需求描述": "Fabric Requirements Description",
        "请详细描述您需要的面料质感、特性（如：冰丝感、高弹、抗菌、防泼水、起皱肌理等）...": "Please describe the fabric texture and properties you need (e.g.: ice-silk feel, high elasticity, antibacterial, water-repellent, wrinkle texture, etc.)...",
        "预期成分": "Expected Composition",
        "预期克重": "Expected GSM",
        "希望颜色": "Desired Color",
        "上传面料描述文件或参考图": "Upload Fabric Description Files or Reference Images",
        "选择图片或 PDF 说明文档": "Select images or PDF documents",
        "浏览文件": "Browse Files",
        "我将寄送实物面料/样衣供开发对色与质检": "I will send physical fabric/garments for color matching and quality inspection",
        "物流单号：": "Tracking Number:",
        "寄件快递单号 (选填)...": "Shipping tracking number...",
        "纯色": "Solid",
        "定制印花": "Custom Print",
        "常规工艺提醒：": "Standard Process Reminder:",
        "作为贴身且不外露的内衬，行业默认使用 黑色或白色。若您指定定染特殊颜色（如撞色里布），大货起订量 (MOQ) 将大幅提升，且可能产生额外费用。": "As a body-touching, non-exposed lining, the industry default is black or white. Specifying custom-dyed special colors (e.g., contrast lining) will significantly increase the bulk MOQ and may incur additional fees.",
        "实物色卡档案": "Physical Swatch Archive",
        "点击查看高清全图": "Click to view full HD image",
        "请输入您选定的色号 (可多选，请用逗号隔开)": "Please enter selected color number(s) (multiple allowed, separated by commas)",
        "对照上方色卡，输入数字编号。例如：24, 36...": "Compare with the swatch card above, enter number(s). E.g.: 24, 36...",
        "注：实拍图受屏幕材质与亮度影响存在微小色差，最终颜色确认将以红绣提供的实物产前样或物理色卡为准。": "Note: Photos may have slight color differences due to screen. Final color is based on the physical pre-production sample or swatch provided by Hongxiu.",
        "选择印花工艺类型": "Select Printing Method",
        "无缝循环印花": "Seamless Pattern Print",
        "图案在面料上无限连续循环重复，适合碎花、迷彩或几何图案。": "Pattern repeats continuously on fabric, suitable for florals, camouflage, or geometric patterns.",
        "定位定版印花": "Placement Print",
        "图案精准印在衣物的特定部位（如胸前），适合单图或特定裁片设计。": "Pattern precisely printed on specific garment areas (e.g., chest), suitable for single graphics or specific panel designs.",
        "上传定制印花设计原稿": "Upload Custom Print Design Original",
        "支持 AI, EPS, PDF, 或 300DPI 以上高清图片": "Supports AI, EPS, PDF, or high-resolution images above 300DPI",
        "印花尺寸比例": "Print Scale",
        "如果您对尺寸没有概念，请在上方区域上传一张成衣效果图 (Mockup)。通过图片展示印花在泳装上的比例位置，版师将据此为您精准还原。": "If you have no concept of size, please upload a garment mockup above. The pattern maker will accurately replicate it based on the image.",
        "调色对照参考": "Color Match Reference",
        "请填写纯色色卡中接近的色号 (如: 24)，方便调色师对照纠偏": "Enter the closest color number from the solid swatch (e.g.: 24) to help the colorist match.",
        "拼色说明与参考附件 (可选)": "Color Blocking Notes & Reference Attachments",
        "请详细描述您的拼色方案、色彩分布部位或特殊修改要求...": "Describe your color blocking plan, color distribution, or special modification requirements...",
        "上传参考图或工艺附件": "Upload Reference Images or Technical Attachments",
        "选择文件": "Select File",
        "里料覆盖范围": "Lining Coverage",
        "全衬里": "Full Lining",
        "局部衬里": "Partial Lining",
        "局部里料位置说明": "Partial Lining Placement Description",
        "例如：仅前幅加里料，后幅单层；或仅裆部加里料...": "E.g.: Only front panel lined, back panel single layer; or only crotch area lined...",
        "我将自行采购并寄送面辅料 (CMT 模式)": "I will purchase and ship fabrics/materials myself",
        "收件仓库：": "Receiving Warehouse:",
        "辽宁省兴城市铁西路10-8A红绣服饰有限公司 物料仓": "Hongxiu Clothing Co., Ltd Material Warehouse, 10-8A Tiexi Road, Xingcheng, Liaoning",
        "收件人：物料核发部 191-6891-9352": "Recipient: Material Distribution Dept 191-6891-9352",
        "客供面料明细描述": "Customer-Supplied Fabric Details",
        "请描述您寄送的面料成分、颜色、卷数及总米数...": "Describe the composition, color, roll count and total meters of fabric you are sending...",
        "面料实物样照/发货清单上传": "Fabric Sample Photos / Shipping List Upload",
        "点击上传图片或 PDF 清单": "Click to upload images or PDF lists",
        "浏览": "Browse",
        "寄件单号：": "Tracking Number:",
        "若已寄出请填写...": "Fill in if shipped...",

        // ── Step 3 ──
        "请在下方标签页中分别配置您需要的品牌辅料。如果不需要某项辅料，保持默认\u201c否\u201d即可。": "Configure your brand trims in the tabs below. If you don't need a certain trim, keep the default \"No\".",
        "开发阶段说明": "Sampling Stage Notice",
        "本步骤配置的所有品牌辅料主要用于大货生产的成本核算与规划。打样阶段将优先使用工厂通用辅料，暂不受此配置影响。需注意，涉及 Logo 开模或定制印刷的辅料因受最低起订量 (MOQ) 限制，通常不会在打样环节单独落实。": "All brand trims configured here are for bulk production cost estimation. The sampling stage uses factory standard trims. Trims involving Logo mold or custom printing are subject to MOQ limits and typically won't be implemented during sampling.",
        "金属饰品": "Metal Hardware",
        "胸垫": "Chest Pad",
        "包装袋": "Packaging Bag",
        "吊牌": "Hang Tag",
        "标签": "Label",
        "卫生贴": "Hygiene Sticker",
        "其他": "Other",
        "是否需要金属饰品？": "Do you need metal hardware?",
        "否": "No",
        "是": "Yes",
        "我将自行采购并寄送该辅料 (CMT 模式)": "I will purchase and send this trim myself",
        "收件仓：": "Receiving Warehouse:",
        "收件人：辅料核发部 191-6891-9352": "Recipient: Trims Distribution Dept 191-6891-9352",
        "客供物料明细描述": "Customer-Supplied Material Details",
        "清单/样照上传": "List / Sample Photo Upload",
        "点击上传": "Click to Upload",
        "寄件单号": "Tracking Number",
        "选填，若已寄出请填写...": "Optional, fill in if shipped...",
        "硬件电镀色调": "Hardware Finish Color",
        "亮金色": "Shiny Gold",
        "亮银色": "Shiny Silver",
        "玫瑰金": "Rose Gold",
        "枪黑色": "Gunmetal",
        "饰品配置模式": "Accessories Configuration Mode",
        "红绣智能代配 (推荐)": "Hongxiu Smart Match",
        "自主定义细节": "Custom Define Details",
        "智能代配说明：": "Smart Match Description:",
        "您无需逐一挑选基础五金。版师将根据您的款式结构，自动匹配防锈防氯的高品质标准件（如常规 8 字扣、O 环、背扣等），确保颜色与上方所选完全一致。": "No need to select basic hardware one by one. The pattern maker will auto-match high-quality, rust-proof and chlorine-resistant standard parts (clasps, O-rings, back clasps, etc.) matching your selected color.",
        "重要提示：智能代配仅涵盖通用基础件。如果您在设计中包含了特殊形状的五金、异形扣，或需要在五金上开模定制品牌 Logo，请务必切换至右侧的「自主定义细节」中逐一提交要求。": "Important: Smart matching only covers common parts. For specially shaped hardware, irregular clasps, or custom Logo mold on hardware, switch to \"Custom Define Details\".",
        "金属件明细定义": "Detailed Metal Specs",
        "清空所有已选金属件": "Clear all selected metal parts",
        "清空明细": "Clear Details",
        "请选择所需类别，选中后在下方展开的面板中填写具体要求。": "Select the required category, then fill details in the expanded panel below.",
        "调节扣/环": "Adjuster / Ring",
        "8字扣、O型环": "Figure-8 Clasp, O-Ring",
        "背扣": "Back Clasp",
        "后背插扣/钩扣": "Back Insert Clasp / Hook Clasp",
        "钢托": "Underwire",
        "胸部定型钢圈": "Bust Shaping Underwire",
        "金属拉链": "Metal Zipper",
        "拉链头及拉链": "Zipper Head and Zipper",
        "按扣": "Snap Button",
        "工字扣、揿扣": "H-Button, Press Stud",
        "金属吊钟": "Metal Cord End",
        "绑带末端装饰": "Strap End Decoration",
        "装饰牌、吊坠等": "Decorative Plates, Pendants, etc.",
        "详细需求说明": "Detailed Requirements Description",
        "请描述规格要求（如：内径 1.2cm）、单件用量等...": "Describe specification (e.g.: inner diameter 1.2cm), quantity per piece, etc...",
        "样式参考图": "Style Reference Image",
        "点击上传参考文件": "Click to upload reference files",
        "需要在该配件上定制品牌 Logo?": "Need custom brand Logo on this accessory?",
        "注：定制专属 Logo 模具需支付开模费，且大货起订量 (MOQ) 通常为 500-1000 件/款。": "Note: Custom Logo mold requires a mold opening fee, and bulk MOQ is typically 500-1000 pcs/style.",
        "点击上传品牌 Logo 矢量图 (AI / PDF / 高清 PNG)": "Click to upload brand Logo vector file",

        // ── Chest Pad ──
        "是否需要配备罩杯/胸垫？": "Do you need cups/chest pads?",
        "胸垫配置模式": "Chest Pad Configuration Mode",
        "罩杯形状与尺码": "Cup Shape & Size",
        "红绣专业建议：": "Hongxiu Professional Suggestions:",
        "形状适配：": "Shape Adaptation:",
        "由于胸垫必须严格适配外部成衣裁片，系统已默认将杯型与您的款式绑定（如三角杯配三角垫，抹胸配圆垫等）。": "Since chest pads must strictly fit outer garment panels, the system defaults to binding cup type with your style.",
        "尺码放缩：": "Size Grading:",
        "我们将在大货生产中，根据成衣的不同尺码 (如 S, M, L, XL)，自动为您放缩并匹配对应大小的胸垫，确保每件衣物呈现完美的穿着比例。除非您有特殊的开模定制需求，否则建议交由我们自动匹配。": "During bulk production, we auto-grade and match pad sizes for different garment sizes (S, M, L, XL). Unless you have special mold requirements, we recommend auto matching.",
        "我有特殊的定制形状或特定尺寸需求 (需重新开模)": "I have special custom shape or specific size requirements",
        "商业提示：": "Commercial Notice:",
        "重新开发特殊形状的模杯/胸垫需支付开模费，且大货起订量 (MOQ) 通常为 3000 副/码 起。": "Special shaped mold cups/pads require a mold opening fee, bulk MOQ typically 3000 pairs/size.",
        "定制形状/特定尺寸描述": "Custom Shape / Specific Size Description",
        "形状参考图上传": "Shape Reference Image Upload",
        "厚度与聚拢需求": "Thickness & Push-up Effect",
        "常规标准": "Standard Regular",
        "约 5-8mm，基础微托力": "About 5-8mm, basic light support",
        "上薄下厚": "Top Thin Bottom Thick",
        "底部加厚垫高 1.5cm+": "Bottom thickened, raised 1.5cm+",
        "胸垫颜色": "Chest Pad Color",
        "海绵裸色": "Nude Sponge",
        "白色": "White",
        "黑色": "Black",
        "其他定制色": "Other Custom Color",
        "提醒：": "Reminder:",
        "特殊染色需送染厂，MOQ 3000 副起": "Special dyeing needs dyeing factory, MOQ 3000 pairs",
        "请输入指定颜色描述或潘通色号...": "Enter the specified color description or Pantone number...",
        "材质或特殊要求描述": "Material or Special Requirements Description",
        "材质或工艺描述": "Material or Craft Description",
        "如：需要替换为透气直立棉、记忆棉；或边缘需要热压处理等...": "E.g.: Replace with breathable standing cotton, memory foam; or edges need heat-press treatment...",
        "参考图上传 (选填)": "Reference Image Upload",
        "点击上传附件": "Click to Upload Attachment",

        // ── Packaging Bag ──
        "是否需要定制品牌包装袋？": "Do you need branded packaging bags?",
        "默认包装方案：": "Default Packaging Plan:",
        "由于您未选择定制包装，我们将统一使用红绣标准无印磨砂拉链袋。": "Since you haven't selected custom packaging, we will use Hongxiu standard unprinted frosted ziplock bags.",
        "正在加载包装袋库...": "Loading packaging bag library...",
        "自定义规格 MOQ 要求：通常需 5000 个起订": "Custom spec MOQ requirement: usually 5000 minimum order",
        "长 (cm)": "Length (cm)",
        "宽 (cm)": "Width (cm)",
        "印刷内容与排版设计": "Print Content & Layout Design",
        "保持原质感，极简优选": "Maintain original texture, minimalist preferred",
        "印制单色 Logo/警示语": "Print single-color Logo/warning text",
        "彩色Logo或平铺满印": "Color Logo or full tiled print",
        "商业提示：定制印刷包装袋（单色或彩色）起订量 (MOQ) 通常为 5000 个起。": "Commercial notice: Custom printed packaging bags MOQ is typically 5000+.",
        "设计图稿/Logo上传": "Design Draft / Logo Upload",
        "点击上传 AI / PDF / 高清图": "Click to upload AI / PDF / HD images",
        "印刷排版要求": "Print Layout Requirements",
        "请详细描述印刷位置与排版要求。": "Please describe print position and layout requirements in detail.",

        // ── Hang Tag ──
        "是否需要品牌吊牌？": "Do you need branded hang tags?",
        "吊牌配置模式": "Hang Tag Configuration Mode",
        "核心纸张材质": "Core Paper Material",
        "白卡纸": "White Cardboard",
        "平滑高白，最常用材质": "Smooth, bright white, most commonly used",
        "铜版纸": "Coated Paper",
        "纸面光滑，色彩还原度高": "Smooth surface, high color reproduction",
        "牛皮纸": "Kraft Paper",
        "复古自然，环保风格": "Vintage natural, eco-friendly style",
        "特种纸、触感纸等定制": "Special paper, textured paper customization",
        "特殊材质需求描述": "Special Material Requirements Description",
        "请描述您需要的纸张特性、厚度、纹理或克重要求...": "Describe the paper properties, thickness, texture, or GSM requirements...",
        "参考样照上传": "Reference Sample Photo Upload",
        "纸张厚度": "Paper Thickness",
        "标准型 (400g)": "Standard (400g)",
        "加厚对裱 (800g)": "Thick Mounted (800g)",
        "形状与规格": "Shape & Size",
        "修长型": "Slim Type",
        "显瘦，裙装/裤装首选": "Slimming, preferred for dresses/pants",
        "通用矩形": "Standard Rectangle",
        "通用性最强，百搭款": "Most versatile, universal style",
        "正方/圆形": "Square / Circle",
        "视觉独特": "Visually unique",
        "童装、内衣、配饰推荐": "Recommended for children's wear, underwear, accessories",
        "异形定制": "Custom Die-Cut Shape",
        "Logo形状等": "Logo shapes, etc.",
        "需开刀模 (MOQ 5000起)": "Requires die cutting (MOQ 5000+)",
        "补充尺寸说明 / 异形要求": "Supplementary size notes / special shape requirements",
        "补充尺寸说明 / 异形要求 (必填)": "Supplementary size notes / special shape requirements (Required)",
        "刀模图/异形参考": "Die-cut template / special shape reference",
        "刀模图/异形参考 (必填)": "Die-cut template / special shape reference (Required)",
        "如：需要特定尺寸 4.5x10cm，或者圆角处理...": "e.g., Need specific size 4.5x10cm, or round corner processing...",
        "请明确指出主牌和副牌各自的尺寸、材质及工艺要求。\n例如：主牌5x8cm白卡纸烫金，副牌4x10cm半透明硫酸纸黑色印刷...": "Please specify the size, material, and craft for each main and sub tag.\ne.g., Main tag 5x8cm white cardboard with gold foil, sub tag 4x10cm translucent tracing paper with black printing...",
        "边缘做圆角处理": "Round corner edge processing",
        "印刷工艺附加": "Printing Craft Add-on",
        "无附加工艺": "No Additional Craft",
        "常规油墨印刷": "Standard ink printing",
        "烫金 / 烫银": "Gold / Silver Foil Stamping",
        "金属质感高亮LOGO": "Metallic sheen highlight LOGO",
        "局部 UV": "Spot UV",
        "特定区域凸起发亮": "Specific areas raised and glossy",
        "凹凸印": "Embossing / Debossing",
        "立体浮雕触感": "3D relief texture effect",
        "丝印、磨砂等特殊工艺": "Silk screen, matte, etc. special crafts",
        "工艺需求描述": "Craft Requirements Description",
        "请描述您需要的特殊印刷工艺及其应用部位...": "Describe the special printing craft and its application areas...",
        "工艺参考图": "Craft Reference Image",
        "吊粒挂绳": "Hang Tag String / Loop",
        "吊粒类型": "Loop Type",
        "常规方块吊粒": "Standard Square Loop",
        "常规方块": "Standard Square",
        "常规子弹头吊粒": "Standard Bullet Loop",
        "常规子弹头": "Standard Bullet",
        "定制材质与形状": "Custom Material & Shape",
        "定制需求": "Custom Requirements",
        "定制特殊形状（如开模 Logo 吊粒）或特殊材质，起订量 (MOQ) 通常为 5000 套起。": "Custom special shapes (e.g., Logo loops) or special materials, MOQ typically 5000 sets.",
        "定制形状/材质描述": "Custom Shape / Material Description",
        "请描述您需要的吊粒形状（如圆形、Logo外形）或材质（如全棉、金属、木质）...": "Describe the loop shape (e.g., round, Logo outline) or material (e.g., cotton, metal, wood)...",
        "参考图上传": "Reference Image Upload",
        "挂绳/吊粒颜色": "Loop / String Color",
        "白色": "White",
        "黑色": "Black",
        "其他颜色": "Other Color",
        "指定特殊颜色染色，MOQ 为 5000 根起": "Specified special color dyeing, MOQ 5000 pcs",
        "请输入潘通色号或颜色描述...": "Enter Pantone number or color description...",
        "我需要子母吊牌 (两张及以上一套)": "I need connected hang tags",
        "注：子母牌通常涉及多种材质叠加，请在下方详细说明。": "Note: Connected tags usually involve multiple material layers, please detail below.",
        "设计稿与排版要求": "Design Drafts & Layout Requirements",
        "设计稿上传": "Design Upload",
        "需包含主/副牌正、反两面设计稿": "Must include front and back designs of main/sub tags",
        "印刷与排版说明": "Print & Layout Instructions",
        "请输入排版要求（例如：Logo居中，需打金银扣眼...）": "Enter layout requirements (e.g.: Logo centered, gold/silver eyelets needed...)",

        // ── Label ──
        "是否需要缝制/无感标签？": "Do you need sewn/tagless labels?",
        "标签配置模式": "Label Configuration Mode",
        "标签材质": "Label Material",
        "标签尺寸 (长x宽)": "Label Size",
        "缝制方式": "Sewing Method",
        "特殊缝制要求描述": "Special Sewing Requirements Description",
        "请描述您需要的特殊缝制位置、折法或固定方式...": "Describe the special sewing position, folding method, or attachment...",
        "标签安装部位与位置": "Label Installation Component & Placement",
        "目标服装部件 (可多选)": "Target Component",
        "上装 / 连体泳装": "Top / One-Piece Swimsuit",
        "下装 / 泳裤": "Bottom / Swim Trunks",
        "详细缝制/烫印位置": "Detailed Sewing/Printing Placement",
        "领后中": "Center Back Neck",
        "主标/无感标首选": "Main label / tagless preferred",
        "左侧缝下端": "Lower Left Side Seam",
        "水洗成分标常规位": "Wash care label standard location",
        "自定义其他位置": "Custom Other Position",
        "如：左胸前等": "E.g.: Left chest, etc.",
        "[上装/连体] 位置选择：": "[TOP/ONE-PIECE] Position Selection:",
        "[下装/裤装] 位置选择：": "[BOTTOM/PANTS] Position Selection:",
        "请输入具体的上装标签安装位置，如：左胸前外露、右袖口...": "Enter the specific top/one-piece label position, e.g., left chest exposed, right cuff...",
        "请输入具体的下装标签安装位置，如：右后腰外置贴标...": "Enter the specific bottom/pants label position, e.g., right back waist external label...",
        "上装/连体 - 自定义位置描述": "Top/One-piece - Custom position description",
        "位置参考图 (选填)": "Position Reference Image",
        "后腰内中": "Center Back Waist",
        "泳裤主标常规位": "Swim trunk main label standard location",
        "左侧缝": "Left Side Seam",
        "水洗标/夹标首选": "Wash label / fold label preferred",
        "在下方文本框描述": "Describe in the text box below",
        "下装/裤装 - 自定义位置描述": "Bottom/Pants - Custom position description",
        "我需要将品牌主标与洗水成分标分开定制": "I need to customize the brand main label and wash care label separately",
        "注：若勾选此项，请在下方明确指出主标与洗水标各自的尺寸、材质及安装位置。": "Note: If checked, specify size, material, and installation position of each label below.",
        "法规与合规性提醒": "Compliance Notice",
        "请务必了解您的目标销售国对服装水洗标的强制性法规要求。通常必须包含：原产地、准确的纤维成分百分比及适用的洗涤护理图标。若因标签缺失必填信息导致海关扣留或市场处罚，工厂无法承担相关责任。": "Please understand your target country's mandatory care label regulations. Must include: Country of Origin, fiber composition percentages, and laundry care icons. The factory cannot be held responsible for customs detention caused by missing label information.",
        "查看常见国家合规示例": "View Common Country Compliance Examples",
        "设计稿/Logo上传": "Design / Logo Upload",
        "文字内容 / 补充说明": "Text Content / Additional Notes",
        "请在此输入标签需要印制的文字内容（成分、产地、洗水标识等），或排版要求...": "Enter the text content to be printed on the label (composition, origin, wash care symbols, etc.), or layout requirements...",

        // ── Hygiene Sticker ──
        "是否需要底裤卫生贴？": "Do you need underwear hygiene stickers?",
        "卫生贴配置模式": "Hygiene Sticker Configuration Mode",
        "材质、形状与尺寸": "Material, Shape & Size",
        "贴纸材质": "Sticker Material",
        "透明 PET (标准)": "Transparent PET",
        "防潮耐用，出货极快": "Moisture-proof, durable, very fast delivery",
        "环保哑光纸": "Eco Matte Paper",
        "100%可降解，触感高级": "100% biodegradable, premium texture",
        "适配底裤剪裁": "Bottom Cut Adaptation",
        "通用葫芦形": "Universal Gourd Shape",
        "适配 95% 连体/三角款式": "Fits 95% one-piece/triangle styles",
        "丁字裤窄形": "Thong Narrow Shape",
        "T-Back/高叉极窄裆部": "T-Back / High-cut ultra-narrow crotch",
        "其他定制形状": "Other Custom Shape",
        "补充形状说明 / 异形要求": "Supplementary shape notes / special shape requirements",
        "刀模图/异形参考 (选填)": "Die-cut template / special shape reference",
        "标签尺寸": "Label Size",
        "我需要自定义特定尺寸 (否则默认使用红绣常规尺寸)": "I need custom specific size",
        "注：如果是通用葫芦形，常规尺寸默认约为 5x11cm。": "Note: For universal gourd shape, default standard size is about 5x11cm.",
        "印刷内容与设计": "Print Content & Design",
        "定制印刷（单色/彩色）起订量 MOQ 均为 5000 枚。若无图稿，默认印制通用英文安全提示语。": "Custom printing MOQ is 5000 pcs. Without artwork, default English safety message printed.",
        "排版要求 / 文字内容": "Layout Requirements / Text Content",
        "粘贴与交付规则": "Application & Delivery Rules",
        "我不需要工厂代贴标，请随大货卷装发出自行贴标。": "I don't need factory application. Ship in rolls with bulk order for self-application.",
        "粘贴位置与数量规则": "Application Position & Quantity Rules",
        "红绣默认将使用低粘医用级背胶，贴于泳衣裆部正中偏前 2cm 处。如有特殊要求（如多件套的粘贴分配），请在此说明。": "Hongxiu defaults to low-tack medical-grade adhesive, applied 2cm forward of center crotch. For special requirements, specify here.",
        "粘贴图示 (选填)": "Application Diagram",

        // ── Other Trims ──
        "是否有其他辅料需求？": "Do you have other trim requirements?",
        "特殊辅料需求描述": "Special Trims Requirements Description",
        "如需特殊定制的辅料（如：YKK防水拉链、品牌防滑硅胶带、反光抽绳、特殊丈根松紧带等），请在此详细说明。": "For special custom trims (e.g.: YKK waterproof zipper, anti-slip silicone band, reflective drawstring, etc.), detail here.",
        "请详细输入辅料名称、材质、尺寸、颜色，以及预期用在衣物的哪个部位。": "Enter trim name, material, size, color, and expected garment placement.",
        "参考图样或工艺单 (选填)": "Reference Images or Tech Pack",
        "点击此处上传参考附件": "Click here to upload reference attachments",

        // ── Step 4 ──
        "请根据当前进度选择交付模式。准确的规划有助于我们为您核算最精确的落地成本。": "Select delivery mode based on current progress. Accurate planning helps calculate the most precise landed cost.",
        "打样开发": "Sampling Development",
        "大货下单": "Bulk Order",
        "开发规模确认": "Development Scale Confirmation",
        "已选 ODM 款式:": "Selected ODM Styles:",
        "自主设计 (OEM) 款式数:": "Custom Design (OEM) Style Count:",
        "系统将根据以上总数生成打样清单": "System will generate sampling list based on total above",
        "详细打样清单": "Detailed Sampling List",
        "打样规格建议": "Sampling Specification Suggestions",
        "打样收费标准": "Sampling Fee Standard",
        "对应款式": "Corresponding Style",
        "样衣类型": "Sample Type",
        "尺码 (选填/自填)": "Size",
        "数量": "Quantity",
        "需求描述 / 备注": "Requirements / Notes",
        "操作": "Action",
        "添加新打样项": "Add New Sample Item",
        "请在上方清单中选择款式以计算费用...": "Select styles in the list above to calculate fees...",
        "预估开发总计 (USD)": "Estimated Development Total (USD)",
        "大货单款 >300件 样板费全额退还": "Bulk order >300 pcs/style, sample fee fully refunded",
        "收费提示：": "Fee Notice:",
        "单款打样超过 2 件，将产生额外的小批量开发费。": "Over 2 samples/style will incur extra small batch development fees.",
        "费用核算说明：": "Fee Calculation Notice:",
        "上述金额仅为基于制版与基础人工的初始预估。": "Above amount is only an initial estimate based on pattern making and basic labor.",
        "此预估未包含数码印花/Logo胶印开版费、多尺码放码费、特殊五金开模及进口面料溢价。最终准确的开发费用，需业务经理结合您前序步骤提交的所有图纸与工艺要求综合评估后，在正式 PI（形式发票）中确认。": "This estimate does NOT include digital print setup fees, multi-size grading fees, special hardware mold costs, or imported fabric surcharges. Final costs confirmed in official PI after sales manager evaluation.",
        "样品接收配置": "Sample Shipping Configuration",
        "样品接收目的地": "Sample Receiving Destination",
        "请选择国家...": "Please select country...",
        "美国 (USA)": "USA",
        "欧洲": "Europe",
        "澳洲": "Australia",
        "中国大陆": "Mainland China",
        "中国": "China",
        "其他地区": "Other Region",
        "首选样品快递": "Preferred Sample Courier",
        "使用客户账号 (到付)": "Use Customer Account",
        "顺丰速运 (仅限国内)": "SF Express",
        "费用说明：": "Fee Notice:",
        "样品国际运费需由客户自理。由于样品重量及包裹体积不确定，具体运费需待我们获取您的详细收货地址并完成打包核算后，方可为您提供最终物流报价。": "International sample shipping at customer's expense. Specific costs quoted after we obtain your detailed shipping address and complete packing calculations.",
        "评估大货预估价": "Evaluate Bulk Estimate Price",
        "是的，请基于我的大货意向核算单价": "Yes, please calculate unit price based on my bulk intent",
        "预估大货数量": "Estimated Bulk Quantity",
        "件 / 套": "pcs / sets",
        "例如: 500": "e.g., 500",
        "如: 10.50 - 13.00": "e.g., 10.50 - 13.00",
        "例: 循环单元 20cm 或 Logo 宽 10cm": "e.g., Repeat unit 20cm or Logo width 10cm",
        "例: 80% Nylon 20% Spandex": "e.g., 80% Nylon 20% Spandex",
        "例: 220g": "e.g., 220g",
        "例: Pantone 19-4052 或 海军蓝": "e.g., Pantone 19-4052 or Navy Blue",
        "简要标识 (如: 红色连体款 / Page 1 比基尼上衣)": "Brief identifier (e.g., Red one-piece / Page 1 Bikini top)",
        "定制开发/全球找样": "Custom Development / Global Sourcing",
        "上传参考图或要求，由红绣为您全球找样/开发": "Upload reference images or requirements for Hongxiu to source/develop globally",
        "例如: 长(L) x 宽(W) cm": "e.g., Length(L) x Width(W) cm",
        "如：需要特定形状以适配特殊的镂空底裤设计，或者Logo轮廓异形...": "e.g., Need a specific shape to match a special cutout bottom design, or irregular Logo contour...",
        "例如：连体衣无需贴，仅分体下裤贴；或者要求贴纸偏后以遮盖后缝线...": "e.g., One-piece garments don't need stickers, only separate bottoms; or request sticker placed rearward to cover back seam...",
        "请填入需要印刷的文字（如：HYGIENE LINER - PLEASE DO NOT REMOVE），或特殊的排版要求...": "Enter text to be printed (e.g., HYGIENE LINER - PLEASE DO NOT REMOVE), or special layout requirements...",
        "请描述您需要的特殊标签材质...": "Describe your special label material requirements...",
        "请详细输入辅料名称、材质、尺寸、颜色，以及预期用在衣物的哪个部位。\n例如：需要 15cm 长的黑色 YKK 隐形拉链，用于后背开襟...": "Enter trim name, material, size, color, and expected garment placement.\ne.g., Need a 15cm black YKK invisible zipper for back opening...",
        "例如：自供 15cm YKK 金属拉链，金色，100条...": "e.g., Self-supplied 15cm YKK metal zipper, gold, 100 pcs...",
        "例如：自供透气直立棉胸垫，肤色，500副...": "e.g., Self-supplied breathable standing cotton chest pads, nude, 500 pairs...",
        "如：需要定制特殊的一体式连体胸垫，或者是指定每个尺码的具体杯长杯宽...": "e.g., Need a custom one-piece chest pad, or specify cup length and width for each size...",
        "A. 材质与袋型": "A. Material & Bag Type",
        "请详细描述您的装箱需求。\n例如：\n1. 外箱需贴 Amazon FBA 标签\n2. 每箱重量不得超过 15kg\n3. 侧唛需印制单号和 SKU 信息": "Please describe your packing requirements in detail.\ne.g.:\n1. Outer cartons need Amazon FBA labels\n2. Each carton must not exceed 15kg\n3. Side marks should include tracking number and SKU info",
        "期望 EXW 单价": "Target EXW Unit Price",
        "预期发货方式": "Expected Shipping Method",
        "海运 (经济型)": "Sea Freight",
        "空运 (时效型)": "Air Freight",
        "预期交货条款": "Expected Incoterms",
        "双清包税": "Duties & Taxes Paid",
        "离岸港口": "Port of Loading",
        "到岸交货": "Delivered at Destination",
        "工厂提货": "Factory Pickup",

        // ── Sampling Guide Modal ──
        "打样规格与专业建议": "Sampling Specifications & Professional Advice",
        "初版样(Proto):": "Proto Sample:",
        "看版型，确认比例。可用替代料。": "Check pattern, confirm proportions. Substitute materials allowed.",
        "修改样(Fit):": "Fit Sample:",
        "调细节，试穿舒适度。": "Adjust details, test wearing comfort.",
        "产前样(PP):": "PP Sample:",
        "最终封样。必须用正确大货面辅料。": "Final approval sample. Must use correct bulk materials.",
        "尺码建议": "Size Recommendation",
        "建议选择 M 码 (US 6-8) 作为打样基准码。": "Recommend M size (US 6-8) as sampling base size.",
        "如果您需要核对放码比例，建议在 PP 样阶段增加一个最大或最小码。": "If verifying grading, add a max or min size at PP stage.",
        "数量说明": "Quantity Guide",
        "个人核对。": "Personal review.",
        "一件寄出，一件版房留底，沟通更高效。": "One shipped, one kept in pattern room, more efficient.",
        "涉及商务样推广，费用会有所增加。": "For commercial sample promotion, fees increase.",

        // ── Fee Standard Modal ──
        "红绣服饰 泳装打样收费标准": "Hongxiu Swimwear Sampling Fee Standard",
        "为保障高水准的研发服务与大货落地的精准度，我们的打样费用采用模块化透明计费。所有打样费均视为\u201c研发押金\u201d，符合条件即可全额退还。": "To ensure high-level R&D service and bulk production precision, our sampling fees use modular transparent billing. All fees are treated as \"R&D deposits\", fully refundable when conditions are met.",
        "基础开发与制版费": "Basic Development & Pattern Making Fee",
        "自主设计 (OEM) 制版：": "Custom Design (OEM) Pattern Making:",
        "现有款式 (ODM) 借版：": "Existing Style (ODM) Pattern Lending:",
        "免费 ($0)": "Free ($0)",
        "开发管理费：": "Development Management Fee:",
        "含前期技术评估、辅料找样及专属项目跟单跟进": "Including preliminary technical evaluation, trim sourcing and dedicated project follow-up",
        "样衣制作费 (按件收取)": "Sample Making Fee",
        "初版样 (Proto)：": "Proto Sample:",
        "修改样 / 产前样：": "Fit / PP Sample:",
        "精细缝制并使用大货正确面料": "Fine sewing using correct bulk fabric",
        "高级工艺附加费 (如涉及需另算)": "Advanced Craft Surcharge",
        "Logo 胶印/烫印开机：": "Logo Printing/Stamping Setup:",
        "数码定位印花/满印调试：": "Digital Placement Print/Allover Print Setup:",
        "多尺码放码费：": "Multi-size Grading Fee:",
        "如需在打样阶段同时制作 2 个以上不同尺码": "If making more than 2 sizes during sampling",
        "特殊物料溢价：": "Special Material Premium:",
        "选用进口面料(如 Carvico 回收纱) 或特殊开模五金，需补足材料差价。": "Using imported fabrics (e.g., Carvico recycled yarn) or special mold hardware, material price difference required.",
        "修改规则与 💎 商业退还计划": "Modification Rules & 💎 Commercial Refund Plan",
        "免费微调：": "Free Minor Adjustment:",
        "制版费内含 1 次 基于初样的免费版型微调。自第 2 次修改起，每次收取 $10 调版费。(重大设计变更需视为新款重新制版)。": "Pattern fee includes 1 free adjustment based on proto. From 2nd modification, $10/time..",
        "大货退还计划：": "Bulk Refund Plan:",
        "当您的款式成功转化为大货订单（单款数量 ≥ 300件）时，对应款式的所有样衣开发相关费用，将在大货尾款中 100% 予以抵扣退还！": "When your style converts to bulk order (≥300 pcs/style), ALL sample development fees for that style will be 100% deducted from bulk balance payment!",

        // ── Bulk Production ──
        "生产规模确认": "Production Scale Confirmation",
        "系统将基于此总数核算大货生产排期": "System will calculate bulk production schedule based on total",
        "详细生产清单": "Detailed Production List",
        "起订量(MOQ)阶梯标准": "MOQ Tier Standard",
        "总数量": "Total Quantity",
        "尺码及数量明细": "Size & Quantity Details",
        "备注 / 描述": "Notes / Description",
        "添加款式生产项": "Add Style Production Item",
        "期望 EXW 大货单价范围": "Target EXW Bulk Unit Price Range",
        "价格核算说明：": "Price Calculation Notice:",
        "此处填写的为您对大货单价的预期。由于大货报价受订单总数、面辅料实时市价、工艺复杂度及汇率等多种动态因素影响，系统目前无法给出实时一口价。最终准确的报价需经由业务经理完成详细成本核算后，以为您提供的正式 Proforma Invoice (PI) 账单为准。": "This is your expected bulk unit price. Since bulk pricing is affected by multiple dynamic factors, the system cannot provide a real-time fixed price. Final quotation confirmed through official PI after sales manager evaluation.",
        "目的地与交货条款": "Destination & Trade Terms",
        "大货目的地：": "Bulk Destination:",
        "美国": "USA",
        "欧洲": "Europe",
        "澳洲": "Australia",
        "中国": "China",
        "包税派送到门": "Tax-inclusive delivery to door",
        "港口/离岸交货": "Port / FOB delivery",
        "成本+保险+运费": "Cost + Insurance + Freight",
        "工厂提货自理": "Factory pickup, self-arranged",
        "运输、装箱与特殊合规需求": "Shipping, Packing & Special Compliance",
        "国际快递": "International Express",
        "空运专线": "Air Freight Line",
        "海运快船": "Sea Freight Express",
        "3-5天": "3-5 Days",
        "8-15天": "8-15 Days",
        "25-40天": "25-40 Days",
        "单件入袋方式": "Individual Bagging Method",
        "独立包装": "Individual Packaging",
        "环保混装": "Eco Bulk Packing",
        "外箱装箱规则": "Outer Carton Packing Rules",
        "独色独码": "One Color One Size",
        "混色混码": "Mixed Colors Mixed Sizes",
        "装箱与唛头细节描述": "Packing & Shipping Mark Details",
        "包装参考/贴标样照": "Packaging Reference / Labeling Sample Photo",
        "上传参考文件": "Upload Reference Files",

        // ── MOQ Modal ──
        "红绣服饰 大货起订量标准": "Hongxiu Bulk MOQ Standard",
        "核心原则：": "Core Principle:",
        "以下所有起订量（MOQ）均指 \"单款单色 (Per Style, Per Color)\"。同一颜色内，尺码可按您的需求配比混合装箱。": "All MOQs refer to \"Per Style, Per Color\". Within the same color, sizes can be mixed.",
        "现有款式 (ODM) + 常规物料": "Existing Style (ODM) + Standard Materials",
        "红绣现有打样成熟的版型，搭配市场现货常规面料、常规颜色及通用辅料。极速返单，适合试水测款。": "Hongxiu's existing proven patterns, standard market fabrics, colors and universal trims. Fast reorder, suitable for testing.",
        "ODM 款式轻定制 + 常规物料": "ODM Light Customization + Standard Materials",
        "在现有款式基础上进行版型微调（如：加宽肩带、修改罩杯结构），需重新调试纸样与裁剪排料。": "Minor pattern adjustments based on existing styles (e.g.: widen straps, modify cup structure), requires readjusting patterns.",
        "自主设计 (OEM) + 常规物料": "Custom Design (OEM) + Standard Materials",
        "由您提供设计稿/参考图全新开版。具体起订量视款式的拼接复杂度与工艺难度而定。": "You provide design drafts for new pattern development. Specific MOQ depends on style complexity and craft difficulty.",
        "任何款式 + 特殊物料": "Any Style + Special Materials",
        "包含且不限于：面料定染指定 Pantone 色、定制定位印花、特殊肌理面料找样、品牌专属五金开模等。": "Including: custom Pantone dyeing, custom placement printing, special texture sourcing, brand exclusive hardware mold, etc.",
        "受限于面料染厂及辅料供应链的最低开机起订要求": "Subject to minimum production requirements of dyeing factories and trim supply chains",
        "MOQ 50件": "MOQ 50 pcs",
        "MOQ 100件": "MOQ 100 pcs",
        "MOQ 100-300件": "MOQ 100-300 pcs",
        "MOQ 300件起": "MOQ 300+ pcs",

        // ── Step 5 ──
        "您的定制需求已基本配置完成。最后，请留下您的商业名片并确认保密条款，我们将为您分派专属团队进行后续对接。": "Your customization requirements are mostly configured. Please leave your business contact and confirm the NDA. We will assign a dedicated team for follow-up.",
        "商业身份档案": "Commercial Identity",
        "联系人姓名": "Contact Name",
        "您的称呼 (如: Alex Wang)": "Your name (e.g., Alex Wang)",
        "您的称呼": "Your Name",
        "联系邮箱 / WhatsApp": "Contact Email / WhatsApp",
        "以便我们发送 PI 报价单": "So we can send you the PI quotation",
        "公司/品牌名称": "Company / Brand Name",
        "品牌官网 / SNS (选填)": "Brand Website / SNS",
        "团队服务指派": "Dedicated Team Assignment",
        "如果您是红绣的老朋友：": "If you are a returning Hongxiu client:",
        "您可以输入曾为您提供过优质服务的业务经理、打版师或样衣组的姓名/编号。新客户请留空，系统将为您智能匹配最合适的专业团队。": "Enter the name/ID of the sales manager, pattern maker or sample team that served you well. New clients leave blank for smart matching.",
        "期望指定的业务经理": "Preferred Sales Manager",
        "如: Sarah Chen (选填)": "e.g., Sarah Chen",
        "期望指定的打版师": "Preferred Pattern Maker",
        "如: 王师傅 (选填)": "e.g., Master Wang",
        "期望指定的样衣组": "Preferred Sample Team",
        "如: A组 (选填)": "e.g., Team A",
        "最终补充与条款确认": "Final Remarks & Confirmation",
        "最终补充要求": "Final Notes",
        "您还有哪些在前面步骤中未能详细说明的特殊要求？（如：需要通过某种特定的环保验厂标准、特定的测试要求等）": "Any special requirements not covered in previous steps? (e.g., eco-certification standards, testing requirements, etc.)",
        "综合参考附件": "Comprehensive Tech Pack",
        "点击上传综合工艺单/企划书": "Click to upload comprehensive tech pack / proposal",
        "支持 PDF / ZIP / Excel (Max 50MB)": "PDF / ZIP / Excel supported (Max 50MB)",
        "我确认上述填写的所有配置需求准确无误。我上传的所有设计稿件、品牌资产及商业数据均受": "I confirm all configuration requirements above are accurate. All my uploaded design files, brand assets, and business data are protected by",
        "《红绣商业保密协议 (NDA)》": "Hongxiu Commercial NDA",
        "严格保护，红绣承诺未经授权绝不外泄给任何第三方。": "strict protection. Hongxiu promises never to disclose to any third party without authorization.",

        // ── Buttons ──
        "返回上一步": "Previous Step",
        "继续下一步": "Next Step",
        "清空当前所有选项": "Clear All Options",
        "重置": "Reset",

        // ── Sidebar ──
        "款式类型": "Style Type",
        "未选择": "Not Selected",
        "面料配置": "Fabric Configuration",
        "面: 未选": "Main: N/A",
        "里: 未选": "Lining: N/A",
        "品牌辅料设置": "Brand Trims Settings",
        "金属饰品:": "Metal Hardware:",
        "罩杯/胸垫:": "Cups/Pads:",
        "包装袋:": "Packaging:",
        "吊牌:": "Hang Tag:",
        "标签:": "Label:",
        "卫生贴:": "Hygiene:",
        "其他辅料:": "Other Trims:",
        "不需要": "Not Required",
        "交付方式": "Delivery Method",
        "客户档案": "Client Profile",
        "待填写...": "Pending...",
        "注意事项：": "Notice:",
        "提交后系统将生成需求编号，业务经理将在1个工作日内联系您。": "A requirement number will be generated after submission. Sales manager will contact you within 1 business day.",
        "样板周期预计 7-10 个工作日。": "Sample lead time: 7-10 business days.",

        // ── Footer ──
        "红绣服饰": "Hongxiu Clothing",
        "专属定制 · 品质追踪": "Exclusive Custom · Quality Tracking",

        // ── Detail Modal ──
        "预览图": "Preview Image",
        "产品详情": "Product Details",
        "红绣品质标准": "Hongxiu QA Standards",
        "红绣品质标准": "Hongxiu QA Standards",
        "针检合格": "Needle Detection Pass",
        "针检合格": "Needle Detection Pass",
        "色牢度 4 级以上 (Color Fastness 4+)": "Color Fastness Grade 4+",
        "色牢度 4 级以上": "Color Fastness Grade 4+",
        "OEKO-TEX 环保染色": "OEKO-TEX Eco-Dyeing",
        "四针六线专业拼缝": "Professional Flatlock Stitch",
        "四针六线专业拼缝": "Professional Flatlock Stitch",

        // ── Custom Modal ──
        "款式轻定制": "Style Light Customization",
        "注意：": "Note:",
        "若该款式为多件套且您仅需其中单件（如仅要上衣或仅要底裤），请务必在下方明确说明。": "If this is a multi-piece set and you only need one piece, specify below.",
        "定制需求描述": "Customization Description",
        "请详细描述您的轻定制需求。": "Describe your light customization needs in detail.",
        "例如：肩带加宽至2cm、使用zigzag边缘工艺等...": "E.g., the shoulder straps are widened to 2 cm, and zigzag edge finishing is applied, etc.",
        "参考附件": "Reference Attachments",
        "上传参考图或工艺单": "Upload reference images or tech packs",
        "取消": "Cancel",
        "保存定制需求": "Save Customization",

        // ── NDA Modal ──
        "商业保密协议": "Non-Disclosure Agreement (NDA)",
        "商业保密协议": "Non-Disclosure Agreement",
        "甲方 (披露方 / Disclosing Party)": "Party A",
        "乙方 (接收方 / Receiving Party)": "Party B",
        "兴城市红绣服饰有限公司": "Xingcheng Hongxiu Clothing Co., Ltd.",
        "第一条 保密内容与范围": "Article 1: Confidential Content & Scope",
        "乙方同意对甲方提供的所有设计稿、图纸、样衣、品牌信息、工艺单及尚未公开的商业计划严格保密。未经甲方明确书面许可，绝不向任何第三方（包括且不限于工厂外包商、竞争对手及公众媒体）透露。": "Party B agrees to strictly keep confidential all design drafts, drawings, samples, brand info, tech packs, and unpublished business plans provided by Party A. Without Party A's explicit written permission, never disclose to any third party.",
        "第二条 知识产权归属": "Article 2: Intellectual Property Ownership",
        "甲方上传的所有设计资料及产生的衍生版型，其全部知识产权及商业版权均完全归甲方所有。乙方仅将上述资料用于甲方指定的产品打样及大货生产环节。": "All design materials and derived patterns uploaded by Party A, all IP and copyrights belong entirely to Party A. Party B will only use such materials for sampling and bulk production designated by Party A.",
        "第三条 数据销毁与违约责任": "Article 3: Data Destruction & Breach Liability",
        "若双方合作终止，乙方有义务应甲方要求彻底销毁系统内的相关设计数据。如乙方违反上述保密约定，需全额赔偿由此给甲方造成的一切直接商业损失及法务成本。": "If cooperation terminates, Party B must destroy related design data at Party A's request. Breach of confidentiality requires full compensation for all direct commercial losses and legal costs.",
        "声明：在您点击\u201c提交定制需求\u201d时，即代表双方自动缔结并生效上述保密条款。": "Declaration: By clicking \"Submit\", both parties automatically enter into the above confidentiality terms.",
        "后续进入大货生产环节前，可根据您的企业合规要求，另行签署具有实体法律效力的纸质版/电子签章版 NDA 协议。": "Before bulk production, a paper/electronic NDA with legal force can be separately signed per your corporate compliance requirements.",
        "我已了解": "I Understand",

        // ── Swatch Modal ──
        "滚轮缩放 · 左键拖拽 · 双击重置": "Scroll to zoom · Drag to pan · Double-click to reset",

        // ── Label Compliance Modal ──
        "常见国家服装标签合规要求参考": "Common Country Clothing Label Compliance Reference",
        "以下信息仅供排版参考，不作为最终法律依据。强烈建议您在投产前向当地报关代理确认最新法规。": "Information for reference only, not legal advice. Confirm latest regulations with your local customs broker before production.",
        "美国 (USA - FTC 要求)": "USA",
        "原产地声明": "Country of Origin Declaration",
        "必须位于颈部标签的显著位置。": "Must be in a prominent position on the neck label.",
        "准确的纤维成分及百分比": "Accurate fiber composition and percentages",
        "按重量递减排列": "Arranged in descending order by weight",
        "制造商的 RN 号或完整公司名称。": "Manufacturer's RN number or full company name.",
        "至少一种推荐的洗涤和保养说明（文字或符合ASTM标准的图标）。": "At least one recommended laundering and care instruction.",
        "欧盟": "European Union",
        "英国": "United Kingdom",
        "使用目标国官方语言表述的纤维成分。": "Fiber composition in the target country's official language.",
        "进口商或制造商在欧盟境内的注册地址。": "Importer's or manufacturer's registered EU address.",
        "必须使用 ISO/GINETEX 体系标准的洗水符号 (通常5个基本符号按顺序排列：洗涤、漂白、干燥、熨烫、专业纺织品维护)。": "Must use ISO/GINETEX standard care symbols (typically 5 basic symbols in order: washing, bleaching, drying, ironing, professional textile care).",
        "澳大利亚": "Australia",
        "新西兰": "New Zealand",
        "强制使用英文的详细护理说明。": "Mandatory detailed care instructions in English.",
        "原产地标识要求非常严格（必须清晰且独立）。": "Country of origin marking must be clear and independent.",
        "如适用，特定功能性服装（如泳衣、防晒服）需提供 UPF 防晒等级声明。": "If applicable, functional garments (e.g., swimwear) require UPF rating declaration.",
        "均码 (OS)": "One Size (OS)",
        "/ 件": "/ pc",

        // ── Login Page ──
        "用户登录": "Login",
        "用户名或邮箱": "Username or Email",
        "密码": "Password",
        "登 录": "Log In",
        "没有账号？点击注册": "No account? Register",
        "忘记密码？": "Forgot password?",
        "创建账号": "Create Account",
        "设置用户名": "Set Username",
        "常用邮箱": "Email",
        "设置密码 (至少8位)": "Set Password (min 8 chars)",
        "注 册": "Register",
        "已有账号？返回登录": "Already have an account? Login",
        "找回密码": "Recover Password",
        "请输入您注册时使用的邮箱，": "Enter the email used during registration,",
        "我们将向您发送重置链接。": "and we'll send you a reset link.",
        "注册邮箱": "Registered Email",
        "发送重置邮件": "Send Reset Email",
        "记起密码了？返回登录": "Remember your password? Login",
        "处理中...": "Processing...",
        "操作成功！": "Success!",
        "操作失败，请重试": "Operation failed, please try again",
        "网络连接失败，请稍后再试": "Network error, please try later",
        "密码长度至少需要 8 位": "Password must be at least 8 characters",

        // ── Reset Page ──
        "设置新密码": "Set New Password",
        "请输入您的新密码并确认。": "Enter and confirm your new password.",
        "密码长度建议不少于 8 位。": "Password should be at least 8 characters.",
        "新密码": "New Password",
        "确认新密码": "Confirm New Password",
        "确认修改": "Confirm",
        "返回登录": "Back to Login",
        "两次输入的密码不一致！": "Passwords do not match!",
        "密码重置成功！即将跳转到登录页...": "Password reset successful! Redirecting to login...",
        "操作失败，请检查链接是否过期": "Operation failed, the link may be expired",

        // ── Missing placeholders ──
        "例如：主标用领后中无感烫印，洗水标用左侧缝高密织唛。尺寸分别为...": "e.g., Main label: Center Back Neck heat transfer, care label: Left Side Seam high-density woven. Sizes are..."
    };

    // ── JS dynamic strings ──
    var jsDynamic = {
        "常规标准 (5-8mm)": "Standard (5-8mm)",
        "海绵裸色": "Foam Nude",
        "取消全选": "Deselect All",
        "暂无款式数据": "No style data available",
        "比基尼": "Bikini",
        "分体": "Two-piece",
        "连体": "One-piece",
        "大码": "Plus Size",
        "儿童": "Children",
        "沙滩裤": "Board Shorts",
        "男裤": "Men's Shorts",
        "查看图片": "View images",
        "版型轻定制": "Pattern customization",
        "✨ 已定制": "✨ Customized",
        "ODM款式": "ODM Styles",
        "(已定制)": "(Customized)",
        "寄送实体样衣": "Send physical sample",
        "待更新物流单号": "Tracking pending",
        "仅文字需求说明": "Text-only description",
        "暂无面料数据": "No fabric data available",
        "里料": "Lining",
        "网纱": "Mesh",
        "常用": "Common",
        "推荐": "Recommended",
        "精选定制面料": "Premium custom fabric",
        "找不到心仪面料？": "Can't find your fabric?",
        "自定义面料": "Custom fabric",
        "定制开发 / 全球找样": "Custom development / Global sourcing",
        "定制找样 / 开发": "Custom sourcing / Development",
        "[ 暂无高清色卡档案 ]": "[No HD color swatch archive]",
        "该面料暂未配置可选色卡。": "No color swatches for this fabric.",
        "定位印花": "Placement print",
        "无缝印花": "Seamless print",
        "待填色号": "Color code pending",
        "未选": "Not selected",
        "客户自行提供物料 (CMT)": "Customer provides (CMT)",
        "待更新单号": "Tracking pending",
        "待补充说明": "Pending description",
        "该面料暂未配置高清物理色卡照片，请直接填写您需要的色号或颜色描述。": "No HD swatch photos. Enter your color code or description directly.",
        "未选择颜色": "No color selected",
        "确认并提交定制需求": "Confirm and Submit",
        "请完整填写商业身份档案中的必填项 (*)，以便我们能联系到您。": "Please complete all required fields (*) in the business identity section.",
        "提交前请阅读并勾选同意商业保密协议 (NDA)。": "Please read and agree to the NDA before submitting.",
        "正在加密传输并分派团队...": "Encrypting and dispatching to team...",
        "抱歉，该项目暂无高清预览图。": "Sorry, no HD preview for this item.",
        "红绣智能代配": "Hongxiu smart matching",
        "异形定制": "Custom shape",
        "红绣常规尺寸": "Hongxiu standard size",
        "不代贴": "Not applied by factory",
        "工厂代贴": "Applied by factory",
        "已传内容": "Content uploaded",
        "待补内容": "Content pending",
        "印标": "Heat transfer label",
        "TPU标": "TPU label",
        "织唛标": "Woven label",
        "100%无触感, 泳装首选": "100% tagless, swimwear preferred",
        "高弹防水, 亲肤磨砂": "High stretch waterproof, skin-friendly",
        "经典品牌感, 质感厚实": "Classic brand feel, thick texture",
        "缎面标/特种标定制": "Satin/special label custom",
        "对折环缝": "Center fold loop sew",
        "夹入侧缝/领缝": "Insert into side/neckline seam",
        "单边平缝": "Single side flat stitch",
        "四周或单边车线": "Stitch around or single edge",
        "自定义特殊缝制": "Custom special sewing",
        "上装/连体": "Top/One-piece",
        "下装/裤装": "Bottom/Pants",
        "领后中": "Center Back Neck",
        "后腰内中": "Center Back Waist",
        "请至少保留一个打标部位": "Keep at least one labeling position",
        "尺寸与缝制详见描述": "Size and sewing details in description",
        "尺寸待定": "Size pending",
        "自定义缝制": "Custom sewing",
        "缝制待说明": "Sewing pending",
        "自定义其他位置": "Custom other position",
        "其他位置": "Other position",
        "[主洗标分开]": "[Main/care label separated]",
        "已开启 (待填写需求)": "Enabled",
        "有需求描述": "Has description",
        "无文字描述": "No text description",
        "定制特殊辅料": "Custom special trims",
        "白卡纸": "White Cardboard",
        "铜版纸": "Coated Paper",
        "牛皮纸": "Kraft Paper",
        "标准修长型 (约 4x9cm)": "Standard slim (approx. 4x9cm)",
        "常规方块吊粒": "Standard square loop",
        "尺寸或特殊异形定制": "Custom size or special shape",
        "定制材质与形状": "Custom material and shape",
        "其他色": "Other color",
        "方块": "Square",
        "子弹头": "Bullet",
        "定制": "Custom",
        "圆角": "Rounded corners",
        "自动适配版型 | 轻薄自然": "Auto-fit | Light and natural",
        "[异形开模]": "[Custom mold]",
        "+特殊诉求": "+Special requirements",
        "匹配成衣版型": "Match garment pattern",
        "亮金色": "Shiny Gold",
        "确定要清空下方已选择的所有金属明细吗？": "Clear all selected metal details?",
        "待选择饰品": "Accessories pending",
        "暂无预览图": "No preview available",
        "优质定制包装": "Premium custom packaging",
        "空白无印": "Blank without printing",
        "未选材质": "Material not selected",
        "未选尺寸": "Size not selected",
        "由红绣推荐": "Recommended by Hongxiu",
        "根据款式自动匹配": "Auto-match based on style",
        "红绣推荐": "Hongxiu recommended",
        "适配常规衣物": "For regular garments",
        "适合内衣/泳装/小配件": "For underwear/swimwear/small accessories",
        "适合常规T恤/背心": "For regular T-shirts/vests",
        "适合卫衣/长裤/外套": "For hoodies/pants/outerwear",
        "自定义规格": "Custom specifications",
        "自定义尺寸": "Custom size",
        "已开启 (待选择材质)": "Enabled",
        "无印": "No print",
        "未命名品牌": "Unnamed brand",
        "未填姓名": "Name not filled",
        "有补充说明": "Has supplementary notes",
        "无补充说明": "No supplementary notes",
        "确定要清空所有已选配置并重头开始吗？": "Clear all selections and start over?",
        "未选择文件": "No files selected",
        "选择矢量文件": "Select vector file",
        "仅开发样衣": "Sample development only",
        "查看详情": "View details",
        "已传设计图": "Design uploaded",
        "无感烫印标": "Tagless heat transfer label",
        "客户自行提供 (CMT)": "Customer provides (CMT)",
        "待写描述": "Description pending",
        "待填单号": "Tracking pending",
        "经典白卡 (350g/500g)": "Classic white card (350g/500g)",
        "通用塑料吊粒": "Standard plastic fastener",
        "自定义尺寸 (未输入)": "Custom size",
        "尚未添加任何款式到打样清单...": "No styles added to sample list...",
        "基础开发与管理": "Basic development & management",
        "OEM 新版制版费": "OEM new pattern fee",
        "样衣制作工时费 (总计)": "Sample making labor",
        "现有款式(ODM)": "Existing style (ODM)",
        "自主设计(OEM)": "Custom design (OEM)",
        "初版样 (Proto)": "Proto Sample",
        "修改/试穿样": "Fit Sample",
        "正确/产前样 (PP)": "PP Sample",
        "-- 请选择款式 --": "-- Select style --",
        "打样阶段": "Sampling stage",
        "待定国": "Country pending",
        "数量待定": "Quantity pending",
        "大货订单": "Bulk order",
        "待定尺码": "Size pending",
        "DDP 双清包税到门": "DDP to door",
        "Sea Freight (海运快船)": "Sea Freight",
        "DHL/FedEx (红绣代办)": "DHL/FedEx",
        "DDP 双清包税": "DDP tax included",
        "Sea Freight (海运)": "Sea Freight",
        "透明PET | 葫芦形 | 代贴标": "PET | Gourd | Applied",
        "✓ 已传稿/内容": "✓ Uploaded",
        "× 待补内容": "× Pending",
        "✓ 已传稿": "✓ Uploaded",
        "× 待传稿": "× Pending",
        "无感印标建议设计为 单色 (黑色或白色)。如需彩色渐变或多色套印，开版费及单价较高。": "Heat transfer labels recommended in single color. Multi-color designs cost more.",
        "TPU 柔感标建议选择 常规黑色。如需指定特殊底色或彩色字，需满足较高的起订量 (MOQ) 且成本较高。": "TPU labels recommended in standard black. Special colors require higher MOQ and cost.",
        "成本提醒：": "Cost reminder:",
        "无感烫印标": "Tagless heat transfer",
        "⚠️ 提交前置校验失败：\n\n您提交了自主设计 (OEM) 需求，为避免后期版型开发与大货生产出现工艺偏差，请务必逐一勾选确认「核心工艺与细节确认单」中的所有必填核对项。": "⚠️ Validation failed:\n\nYou submitted a custom design (OEM) request. Please check all items in the \"Core Specifications Checklist\".",
        "✅ 提交成功！\n\n您的需求编号为: HX20240508001\n专属业务经理将在 24 小时内为您提供正式报价。": "✅ Submitted successfully!\n\nYour request number: HX20240508001\nA dedicated account manager will provide a formal quote within 24 hours.",
        "例: 黑色碎花款": "e.g., Black floral style",
        "例：\nS: 20\nM: 50\nL: 30": "e.g.,\nS: 20\nM: 50\nL: 30",
        "例：\n主体黑色，撞色滚边\n注意防水拉链": "e.g.,\nBlack body, contrast piping\nNote: waterproof zipper",
        "选或填": "Select or type",
        "描述：": "Description:",

        // ── OEM Detail Panel ──
        "OEM 自主设计包:": "OEM Custom Design Package:",
        "已传:": "Uploaded:",
        "图 /": "image(s) /",
        "文件": "file(s)",
        "共": "Total",
        "款设计": "design(s)",
        "单号:": "Tracking #:",
        "色号:": "Color:",
        "描述:": "Desc:",
        "图": "img",

        // ── Chinese Numerals ──
        "一、 ": "I. ",
        "二、 ": "II. ",
        "三、 ": "III. ",
        "四、 ": "IV. "
    };

    // Fragment entries for partial matching in template literals
    var fragments = {
        "文件 ": "File ",
        "印花文件 ": "Print file ",
        " 超过 20MB": " exceeds 20MB",
        " 超过 50MB 限制": " exceeds 50MB limit",
        "已选 ": "Selected ",
        " 个文件": " file(s)",
        " 个附件": " attachment(s)",
        " 个综合附件": " comprehensive attachment(s)",
        "已成功添加 ": "Successfully added ",
        "已选色号 (": "Selected colors (",
        ")：": "): ",
        "共 ": "Total ",
        " 款设计": " designs",
        " 款": " style(s)",
        "配置：": "Configure: ",
        "确定要清空 [": "Clear selections for [",
        "] 的选择吗？": "]?",
        "对色: ": "Color ref: ",
        "尺寸: ": "Scale: ",
        "色号: ": "Color: ",
        "单号: ": "Tracking: ",
        "描述: ": "Desc: ",
        "设计稿: ": "Design: ",
        "内容状态: ": "Status: ",
        "清单: ": "List: ",
        "项 / 共": " items / total",
        "件 | 快递: ": " pcs | Courier: ",
        "评估大货: ": "Bulk eval: ",
        "OEM-第 ": "OEM - Style ",
        "：定制开发/全球找样": ": Custom Development / Global Sourcing",
        "⚠️ 起订量提醒：\n您选择的是 ": "⚠️ MOQ Reminder:\nYou selected ",
        "，该类型单款最低起订量为 ": ", minimum order quantity per style is ",
        " 件。\n\n系统已自动为您调整为最低起订量。": " pcs.\n\nSystem has auto-adjusted to minimum.",
        "局部衬里: ": "Partial lining: ",
        "目标 $": "Target $"
    };

    // ==================== Rich Text (HTML) Dictionary ====================
    // For elements where <strong>/<span>/<br> split text into multiple DOM nodes.
    // m = unique Chinese substring to identify the element's textContent
    // h = complete English innerHTML replacement
    var richDict = [
        // Step 1 OEM: upload tip
        { m: '上传对应提示：', h: '<strong>Upload Tip:</strong> If you submitted multiple designs, please ensure the <strong>reference image filenames</strong> or <strong>tech pack page numbers</strong> uploaded below clearly correspond to the "Style 1, Style 2\u2026" descriptions in Area A.' },
        // Step 1 OEM: sample shipping address (2x)
        { m: '收件地址：', h: '<strong>Shipping Address:</strong> Hongxiu Garment Co., Ltd., 10-8A Tiexi Rd, Xingcheng, Liaoning, China (Recipient: Mr. Liu 177-1101-4152)' },
        // Step 1 OEM: core process checklist intro
        { m: '为确保大货落地的极致精准度', h: 'To ensure ultimate precision in bulk production, below are the <strong>most critical and easily overlooked process specifications</strong> in your custom design. Please verify that your uploaded design files or supplementary notes above cover all the following items, and <strong style="color: #ef4444;">check each box to confirm</strong> before proceeding.' },
        // Step 2: fabric sourcing note
        { m: '找样特别说明：', h: '<strong>Fabric Sourcing Note:</strong><br>\u2022 Lead time: Approx. <strong>3\u20137 business days</strong>, depending on material availability.<br>\u2022 Service fee: Special sourcing may incur additional procurement and shipping surcharges.<br>\u2022 <strong>Key Recommendation:</strong> To ensure 100% accuracy in texture, weight, and color matching, we strongly recommend sending <strong>physical fabric swatches / sample garments</strong> for reference.' },
        // Step 2: lining reminder
        { m: '常规工艺提醒：', h: '<strong>Standard Process Reminder:</strong> As a body-contact, non-visible lining, the industry default is <strong>black or white</strong>. If you specify custom-dyed special colors (e.g., contrast lining), the bulk MOQ will increase significantly and additional fees may apply.' },
        // Step 2: print size tip
        { m: '如果您对尺寸没有概念', h: 'If you have no concept of the dimensions, please upload a <strong>garment mockup image</strong> in the area above. By showing the print\'s proportional placement on the swimwear, our pattern maker will accurately reproduce it for you.' },
        // Step 2: material warehouse (fabric)
        { m: '收件仓库：', h: '<strong>Receiving Warehouse:</strong> Hongxiu Garment Co., Ltd. Material Warehouse, 10-8A Tiexi Rd, Xingcheng, Liaoning (Recipient: Material Dept. 191-6891-9352)' },
        // Step 3: development stage note
        { m: '开发阶段说明：', h: '<strong style="color: #475569;">Development Stage Note:</strong><br>All brand trims configured in this step are primarily for <strong>bulk production cost estimation and planning</strong>. During the sampling phase, factory standard trims will be used by default. Note that trims involving Logo molding or custom printing are subject to MOQ requirements and typically <strong>will not be fulfilled separately during sampling</strong>.' },
        // Step 3: trim warehouse address (7x)
        { m: '收件仓：', h: '<strong>Receiving Warehouse:</strong> Hongxiu Garment Co., Ltd. Material Warehouse, 10-8A Tiexi Rd, Xingcheng, Liaoning<br><strong>Recipient:</strong> Trim Dept. 191-6891-9352' },
        // Step 3: metal smart match (inner div with <strong>)
        { m: '逐一挑选基础五金', h: '<strong style="color:var(--primary-color);">Smart Match Description:</strong> No need to individually select basic hardware. The pattern maker will auto-match high-quality, rust-proof and chlorine-resistant standard parts (e.g., figure-8 clasps, O-rings, back clasps) based on your style structure, ensuring colors perfectly match your selection above.' },
        // Step 3: pad smart match (inner div with <strong>)
        { m: '确定的款式轮廓', h: '<strong style="color:var(--primary-color);">Smart Match Description:</strong> Based on the style silhouette(s) confirmed in Step 1, we will automatically match the best-fitting chest pad shape, thickness (default: light and natural), and color (default: Nude/Black). Ensuring perfect integration with the garment pattern for optimal wearing experience \u2014 no additional configuration needed.' },
        // Step 3: pad expert advice
        { m: '红绣专业建议：', h: '<strong>Hongxiu Expert Advice:</strong><br>1. <strong>Shape Matching:</strong> Since breast pads must precisely conform to the outer garment panels, the system has automatically linked the cup type to your style (e.g., triangle cups with triangle pads, bandeau with round pads, etc.).<br>2. <strong>Size Grading:</strong> During bulk production, we will <strong>automatically grade and match appropriately sized breast pads based on garment sizes (e.g., S, M, L, XL)</strong>, ensuring perfect proportions for each piece. Unless you have special molding requirements, we recommend leaving this to our automatic matching.' },
        // Step 3: pad molding commercial tip
        { m: '重新开发特殊形状的模杯', h: '<strong style="color: #b45309;">Commercial Note:</strong> Developing custom-shaped molded cups/pads requires a mold fee, and the bulk MOQ is typically <strong>3,000 pairs/size</strong> minimum.' },
        // Step 3: pad dye reminder
        { m: '特殊染色需送染厂', h: '<strong>Reminder:</strong> Special dyeing requires factory processing, MOQ <strong>3,000 pairs min.</strong>' },
        // Step 3: default packaging
        { m: '默认包装方案：', h: '<strong>Default Packaging:</strong> Since you did not select custom packaging, we will use the <strong>Hongxiu standard unprinted frosted zip bag</strong>.' },
        // Step 3: hangtag auto-match
        { m: '经典白卡纸+标准矩形', h: '<strong style="color:var(--primary-color);">Smart Auto-Match:</strong> We will match you with the best-selling <strong>classic white cardboard + standard rectangular size + white/black universal string fastener</strong>. Simply upload your Logo or design below; the Hongxiu visual team will handle material selection and process matching.' },
        // Step 3: hangtag string commercial tip
        { m: '如开模 Logo 吊粒', h: '<strong style="color: #b45309;">Commercial Note:</strong> Custom shapes (e.g., molded Logo string fasteners) or special materials typically require a MOQ of <strong>5,000 sets min.</strong>' },
        // Step 3: hangtag string dye reminder
        { m: '指定特殊颜色染色', h: '<strong>Reminder:</strong> Custom color dyeing requires a MOQ of <strong>5,000 pieces min.</strong>' },
        // Step 3: label auto-match
        { m: '最舒适的无感烫印标', h: '<strong style="color:var(--primary-color);">Smart Auto-Match:</strong> We will default to the most comfortable <strong>tagless heat-transfer label</strong>, printed at the <strong>center back neck</strong> position. Simply provide the text content or design below; the Hongxiu visual team will handle compliant layout.' },
        // Step 3: care label compliance
        { m: '法规与合规性提醒：', h: '<strong>Regulatory Compliance Reminder:</strong><br>Please ensure you understand your target market\'s mandatory care label regulations. Required information typically includes: <strong>country of origin</strong>, accurate <strong>fiber composition percentages</strong>, and applicable <strong>care instruction symbols</strong>. The factory cannot be held responsible for customs seizure or market penalties caused by missing mandatory label information.' },
        // Step 3: hygiene sticker auto-match
        { m: '透明 PET 材质 + 通用葫芦形', h: '<strong style="color:var(--primary-color);">Smart Auto-Match:</strong> We will configure the best-selling <strong>\u201cTransparent PET + Universal Gourd Shape\u201d</strong> hygiene sticker with international standard English safety text. Before shipment, we will <strong>apply them to the crotch area of bottoms at no extra charge</strong>. No additional configuration needed.' },
        // Step 4: extra fee warning
        { m: '\u26A0\uFE0F 收费提示：', h: '<strong>\u26A0\uFE0F Fee Notice:</strong> Sampling more than 2 pieces per style will incur additional small-batch development fees.' },
        // Step 4: cost estimate note
        { m: '费用核算说明：', h: '<strong style="color: #64748b;">Cost Estimation Note:</strong> The amounts above are only <span style="color: var(--text-main);">preliminary estimates based on pattern-making and basic labor</span>.<br>This estimate <strong style="color: #ef4444;">does not include</strong> digital print/Logo screen setup fees, multi-size grading fees, special hardware molding, or imported fabric surcharges. The final development cost will be confirmed in the official PI (Proforma Invoice) after comprehensive evaluation.' },
        // Sample guide: sample types
        { m: '初版样(Proto):', h: '<strong>Proto Sample:</strong> Review silhouette and proportions. Substitute fabrics allowed.<br><br><strong>Fit Sample:</strong> Fine-tune details and fit comfort.<br><br><strong>Pre-Production Sample (PP):</strong> Final approval sample. Must use correct bulk fabrics and trims.' },
        // Sample guide: size recommendation
        { m: '建议选择', h: 'We recommend selecting <strong>Size M (US 6-8)</strong> as the sampling base size.<br><br>If you need to verify the grading ratio, consider adding the largest or smallest size during the PP sample stage.' },
        // Sample guide: quantity explanation
        { m: '个人核对', h: '<strong>1 piece:</strong> Personal review.<br><br><strong>2 pieces (recommended):</strong> One for you, one for the pattern room \u2014 more efficient communication.<br><br><strong>&gt;2 pieces:</strong> Involves sales samples; additional fees apply.' },
        // Fee modal: OEM pattern-making
        { m: '自主设计 (OEM) 制版：', h: '<strong>Custom Design (OEM) Pattern-making:</strong> $20 / style' },
        // Fee modal: ODM pattern loan
        { m: '现有款式 (ODM) 借版：', h: '<strong>Existing Style (ODM) Pattern Loan:</strong> <span style="color: #27ae60; font-weight: 600;">Free ($0)</span>' },
        // Fee modal: dev management fee
        { m: '开发管理费：', h: '<strong>Development Management Fee:</strong> $10 / style (includes technical evaluation, trim sourcing, and dedicated project follow-up)' },
        // Fee modal: proto sample
        { m: '初版样 (Proto)：', h: '<strong>Proto Sample:</strong> $10 / piece' },
        // Fee modal: fit / pre-production sample
        { m: '修改样 / 产前样：', h: '<strong>Fit / Pre-Production Sample:</strong> $20 / piece (precision sewing with correct bulk fabrics)' },
        // Fee modal: Logo print setup
        { m: 'Logo 胶印/烫印开机：', h: '<strong>Logo Screen/Heat Print Setup:</strong> Est. $25 / style' },
        // Fee modal: digital print setup
        { m: '数码定位印花/满印调试：', h: '<strong>Digital Placement/All-over Print Setup:</strong> Est. $10 / style' },
        // Fee modal: multi-size grading
        { m: '多尺码放码费：', h: '<strong>Multi-size Grading Fee:</strong> $10 / style (if more than 2 sizes needed during sampling)' },
        // Fee modal: special material surcharge
        { m: '特殊物料溢价：', h: '<strong>Special Material Surcharge:</strong> Using imported fabrics (e.g., Carvico recycled yarn) or custom-molded hardware requires covering the material cost difference.' },
        // Fee modal: free adjustment
        { m: '免费微调：', h: '<strong>Free Adjustment:</strong> The pattern fee includes <strong style="color:var(--primary-color);">1 free</strong> fit adjustment based on the proto sample. From the 2nd revision onward, $10 adjustment fee per revision. (Major design changes require re-patterning as a new style).' },
        // Fee modal: bulk order refund plan
        { m: '\uD83D\uDC8E 大货退还计划：', h: '<strong>\uD83D\uDC8E Bulk Order Refund Plan:</strong> When your style converts to a bulk order (\u2265 300 pieces per style), <strong style="text-decoration: underline;">all sample development fees</strong> for that style will be 100% credited and refunded in the bulk order final payment!' },
        // Step 4: fee notice (sample shipping)
        { m: '样品国际运费需由客户自理', h: '<strong style="color: #475569;">Fee Notice:</strong> International sample shipping is at the customer\u2019s expense. Due to uncertain sample weight and parcel size, exact shipping costs can only be quoted after we obtain your <strong style="color: var(--primary-color);">detailed shipping address</strong> and complete packing calculations.' },
        // Step 4: price calculation notice
        { m: '此处填写的为您对大货单价的预期', h: '<strong style="color: #64748b;">Price Calculation Notice:</strong> This field is for your expected bulk unit price. Since bulk pricing is affected by <strong style="color:#475569;">total order quantity, real-time fabric/trim market prices, craft complexity, and exchange rates</strong>, the system cannot provide a real-time fixed price. The final accurate quotation will be confirmed by the sales manager after detailed cost analysis, based on the official <strong>Proforma Invoice (PI)</strong>.' },
        // MOQ modal: core principle
        { m: '以下所有起订量', h: '<strong style="color: #475569;">Core Principle:</strong> All MOQs below refer to <strong>\u201cPer Style, Per Color\u201d</strong>. Within the same color, sizes can be mixed and packed according to your ratio requirements.' },
        // Care label: ISO/GINETEX
        { m: 'ISO/GINETEX', h: 'Must use <strong>ISO/GINETEX standard care symbols</strong> (typically 5 basic symbols in order: washing, bleaching, drying, ironing, professional textile care).' },
        // Step 4: cost estimate note (in sampling section)
        { m: '上述金额仅为', h: '<strong style="color: #64748b;">Cost Estimation Note:</strong> The amounts above are only <span style="color: var(--text-main);">preliminary estimates based on pattern-making and basic labor</span>.<br>This estimate <strong style="color: #ef4444;">does not include</strong> digital print/Logo screen setup fees, multi-size grading fees, special hardware molding, or imported fabric surcharges. The final development cost will be confirmed in the official PI (Proforma Invoice) after comprehensive evaluation by the sales manager.' },
        // MOQ modal: Level 4 special materials
        { m: '包含且不限于', h: 'Including: custom Pantone dyeing, custom placement printing, special texture sourcing, brand exclusive hardware mold, etc. <strong>(Subject to minimum production requirements of dyeing factories and trim supply chains)</strong>' }
    ];

    // Merge jsDynamic into dict
    for (var k in jsDynamic) {
        if (jsDynamic.hasOwnProperty(k) && !dict[k]) {
            dict[k] = jsDynamic[k];
        }
    }

    // Pre-sorted keys for partial matching
    var _sortedKeys = null;
    function getSortedKeys() {
        if (_sortedKeys) return _sortedKeys;
        var allKeys = {};
        var k;
        for (k in dict) { if (dict.hasOwnProperty(k) && /[\u4e00-\u9fff]/.test(k)) allKeys[k] = dict[k]; }
        for (k in fragments) { if (fragments.hasOwnProperty(k) && /[\u4e00-\u9fff]/.test(k)) allKeys[k] = fragments[k]; }
        _sortedKeys = Object.keys(allKeys).sort(function(a, b) { return b.length - a.length; });
        _sortedKeys._map = allKeys;
        return _sortedKeys;
    }

    // ==================== Translation Engine ====================

    /**
     * Translate a Chinese string to English.
     * Supports exact match and partial replacement for template literals.
     */
    function _t(text) {
        if (LANG === 'zh' || !text) return text;
        // Exact match first
        if (dict[text]) return dict[text];
        // Trim and retry
        var trimmed = text.trim();
        if (dict[trimmed]) return dict[trimmed];

        // Partial replacement for strings with Chinese that don't have exact match
        if (/[\u4e00-\u9fff]/.test(text)) {
            var keys = getSortedKeys();
            var map = keys._map;
            var result = text;
            for (var i = 0; i < keys.length; i++) {
                if (result.indexOf(keys[i]) !== -1) {
                    result = result.split(keys[i]).join(map[keys[i]]);
                }
            }
            return result;
        }
        return text;
    }

    /**
     * Translate a template literal string that may have dynamic parts.
     * Usage: _tf`已选 ${count} 个文件` → "${count} file(s) selected"
     * Falls back to original if no translation pattern found.
     */
    function _tf(strings) {
        var values = Array.prototype.slice.call(arguments, 1);
        // Build the full Chinese string for lookup
        var zhFull = '';
        for (var i = 0; i < strings.length; i++) {
            zhFull += strings[i];
            if (i < values.length) zhFull += values[i];
        }
        // Try exact match
        if (dict[zhFull]) return dict[zhFull];
        // Build pattern key with ${} placeholders for lookup
        var zhPattern = '';
        for (var j = 0; j < strings.length; j++) {
            zhPattern += strings[j];
            if (j < values.length) zhPattern += '${...}';
        }
        // Just return the Chinese full string as fallback
        return zhFull;
    }

    /**
     * Translate elements containing inline HTML (<strong>, <span>, etc.)
     * that split text into multiple DOM nodes the text-walker cannot match.
     */
    function translateRichElements(root) {
        if (LANG === 'zh' || richDict.length === 0) return;
        root = root || document.body;
        var els = root.querySelectorAll('div, span, p, li, td, label');
        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            if (el.getAttribute('data-i18n-done')) continue;
            var tag = el.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') continue;
            // Must have at least one direct inline-element child
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
            if (!tc || !/[\u4e00-\u9fff]/.test(tc)) continue;
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
     * Walk all text nodes in the DOM and replace Chinese text with English.
     */
    function translateDOM(root) {
        if (LANG === 'zh') return;
        root = root || document.body;

        // First pass: translate elements with inline HTML children
        translateRichElements(root);

        // Second pass: translate individual text nodes
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        var node;
        var replacements = [];

        while (node = walker.nextNode()) {
            var text = node.nodeValue;
            if (!text || !text.trim()) continue;
            // Skip script/style nodes
            var parent = node.parentNode;
            if (!parent) continue;
            var tag = parent.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') continue;

            var trimmed = text.trim();
            // Check if it contains Chinese characters
            if (!/[\u4e00-\u9fff]/.test(trimmed)) continue;

            // Try exact match
            if (dict[trimmed]) {
                // Preserve leading/trailing whitespace
                var leading = text.match(/^\s*/)[0];
                var trailing = text.match(/\s*$/)[0];
                replacements.push({ node: node, value: leading + dict[trimmed] + trailing });
                continue;
            }

            // Try partial replacement: replace each known Chinese phrase
            var newText = text;
            var changed = false;
            // Sort keys by length desc to match longest first
            var sortedKeys = Object.keys(dict).filter(function(k) {
                return /[\u4e00-\u9fff]/.test(k);
            }).sort(function(a, b) {
                return b.length - a.length;
            });

            for (var i = 0; i < sortedKeys.length; i++) {
                var zhKey = sortedKeys[i];
                if (newText.indexOf(zhKey) !== -1) {
                    newText = newText.split(zhKey).join(dict[zhKey]);
                    changed = true;
                }
            }
            if (changed) {
                replacements.push({ node: node, value: newText });
            }
        }

        // Apply all replacements
        for (var r = 0; r < replacements.length; r++) {
            replacements[r].node.nodeValue = replacements[r].value;
        }

        // Also translate placeholder, title, and alt attributes
        var elements = root.querySelectorAll('[placeholder], [title], [alt]');
        for (var e = 0; e < elements.length; e++) {
            var el = elements[e];
            ['placeholder', 'title', 'alt'].forEach(function(attr) {
                var val = el.getAttribute(attr);
                if (val && /[\u4e00-\u9fff]/.test(val)) {
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
            if (/[\u4e00-\u9fff]/.test(optText) && dict[optText]) {
                options[o].textContent = dict[optText];
            }
        }
    }

    /**
     * Set up a MutationObserver to translate dynamically inserted content.
     * Uses debounced translateDOM for full partial-matching support.
     */
    function observeDOM() {
        if (LANG === 'zh') return;
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
                            if (val && /[\u4e00-\u9fff]/.test(val.trim())) {
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
                            if (tv && /[\u4e00-\u9fff]/.test(tv.trim())) {
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
            // Debounced batch translation for added elements
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
        // Set cookie and reload
        fetch('/api/set-language', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lng: lng })
        }).then(function () {
            window.location.reload();
        });
    }

    // ==================== Init ====================

    // Run on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            translateDOM();
            observeDOM();
        });
    } else {
        translateDOM();
        observeDOM();
    }

    // Also run after short delay to catch late-rendered content
    window.addEventListener('load', function () {
        setTimeout(function () { translateDOM(); }, 300);
        setTimeout(function () { translateDOM(); }, 1000);
    });

    // Expose globals
    window._t = _t;
    window._tf = _tf;
    window.translateDOM = translateDOM;
    window.setLanguage = setLanguage;
    window.__i18nDict = dict;

})();
