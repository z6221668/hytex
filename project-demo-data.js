'use strict';
window.HYTEX_PROJECT_DEMOS = [
  {
    "optimization": null,
    "flow": {
      "title": "两款产品背后的多微服务协作",
      "nodes": [
        "产品入口",
        "基础服务",
        "跨服务协作",
        "异步与缓存",
        "服务治理"
      ],
      "notes": [
        "爱提词与全能扫描王接入同一套数据中台，各自使用所需的产品能力。",
        "中台提供用户、交易、内容处理与基础服务，整体由 50+ 微服务组成。",
        "不同业务线存在跨服务依赖，公共组件与 SDK 用于不同产品的接入。",
        "参与缓存体系重构和异步化改造，处理服务间的数据读取与非即时任务。",
        "参与服务治理升级，配合 Spring Cloud Alibaba 的注册、配置与微服务协作。"
      ]
    },
    "database": "优化存量 SQL、索引与表结构。",
    "focus": {
      "title": "50+ 微服务协作的数据中台",
      "context": "盘古数据中台由 50+ 微服务组成，为爱提词和全能扫描王提供用户、交易、内容处理与基础服务。",
      "contribution": "参与基础服务迭代、服务治理升级、缓存重构与异步化改造；梳理跨业务线依赖，封装公共组件与 SDK。"
    },
    "technical": "负责发布包信息的索引写入，以及按平台、版本条件查询的接口。",
    "graph": {
      "nodes": [
        {
          "id": "in",
          "label": "文档",
          "x": 55,
          "y": 110
        },
        {
          "id": "base",
          "label": "用户 / 交易",
          "x": 185,
          "y": 110
        },
        {
          "id": "ocr",
          "label": "OCR",
          "x": 315,
          "y": 65
        },
        {
          "id": "format",
          "label": "文档结构化",
          "x": 445,
          "y": 110
        },
        {
          "id": "scan",
          "label": "扫描王",
          "x": 550,
          "y": 110
        },
        {
          "id": "asr",
          "label": "ASR / 台本",
          "x": 315,
          "y": 170
        },
        {
          "id": "prompt",
          "label": "爱提词",
          "x": 485,
          "y": 195
        }
      ],
      "edges": [
        [
          "in",
          "base"
        ],
        [
          "base",
          "ocr"
        ],
        [
          "ocr",
          "format"
        ],
        [
          "format",
          "scan"
        ],
        [
          "base",
          "asr"
        ],
        [
          "asr",
          "prompt"
        ]
      ],
      "route": [
        "in",
        "base",
        "ocr",
        "format",
        "scan"
      ]
    },
    "architecture": true,
    "index": {
      "title": "发布包信息的索引写入与条件查询",
      "nodes": [
        "包信息写入",
        "按平台建索引",
        "按版本建索引",
        "选择查询条件",
        "合并候选包",
        "返回包信息"
      ],
      "notes": [
        "写入发布包信息，包 ID 对应平台、版本等包信息。",
        "按平台记录对应的包 ID 集合，形成「平台 → 包 ID」映射。",
        "按版本记录对应的包 ID 集合，形成「版本 → 包 ID」映射。",
        "接口接收平台和版本条件，分别取得对应候选包 ID。",
        "同时满足平台和版本条件，取两组候选 ID 的交集。",
        "根据命中的包 ID 获取对应包信息，返回查询结果。"
      ],
      "records": [
        {
          "id": "P01",
          "name": "发布包 A",
          "platform": "Android",
          "version": "1.0"
        },
        {
          "id": "P02",
          "name": "发布包 B",
          "platform": "iOS",
          "version": "1.0"
        },
        {
          "id": "P03",
          "name": "发布包 C",
          "platform": "Android",
          "version": "1.1"
        },
        {
          "id": "P04",
          "name": "发布包 D",
          "platform": "Android",
          "version": "1.1"
        },
        {
          "id": "P05",
          "name": "发布包 E",
          "platform": "iOS",
          "version": "1.1"
        },
        {
          "id": "P06",
          "name": "发布包 F",
          "platform": "Android",
          "version": "2.0"
        }
      ]
    }
  },
  {
    "optimization": null,
    "flow": {
      "title": "机构规则与用户申请在匹配环节相遇",
      "nodes": [
        "用户申请",
        "产品与授信规则",
        "资料与风控结果",
        "贷款方案匹配",
        "审批与放款"
      ],
      "notes": [
        "C 端用户提交贷款申请资料。",
        "B 端机构配置贷款产品和授信规则。",
        "结合申请资料、信用情况与风控结果。",
        "根据用户条件和机构规则匹配贷款方案。",
        "进入审批与放款流程，后续提供还款管理和逾期提醒。"
      ]
    },
    "database": "新增名单分批入库、批量提交；操作日志按月份分表。",
    "focus": {
      "title": "白名单批量导入与已有数据标记",
      "context": "系统需要批量维护白名单，导入时判断记录是否已存在，并标记已有和新增数据。",
      "contribution": "使用布隆过滤器、Redis 与 MySQL 批处理完成名单导入，减少重复查询并处理批量写入。"
    },
    "technical": "使用布隆过滤器、Redis 和 MySQL 批处理导入白名单，并标记已存在的数据。",
    "graph": {
      "nodes": [
        {
          "id": "in",
          "label": "用户申请",
          "x": 55,
          "y": 130
        },
        {
          "id": "rule",
          "label": "产品 / 授信",
          "x": 175,
          "y": 70
        },
        {
          "id": "risk",
          "label": "资料 / 风控",
          "x": 300,
          "y": 130
        },
        {
          "id": "match",
          "label": "方案匹配",
          "x": 425,
          "y": 130
        },
        {
          "id": "finish",
          "label": "审批 / 放款",
          "x": 550,
          "y": 130
        },
        {
          "id": "b",
          "label": "机构端配置",
          "x": 175,
          "y": 200
        }
      ],
      "edges": [
        [
          "in",
          "rule"
        ],
        [
          "rule",
          "risk"
        ],
        [
          "risk",
          "match"
        ],
        [
          "match",
          "finish"
        ],
        [
          "b",
          "rule"
        ]
      ],
      "route": [
        "in",
        "rule",
        "risk",
        "match",
        "finish"
      ]
    },
    "whitelist": {
      "title": "白名单导入：先筛查，再批处理和标记",
      "nodes": [
        "读取名单",
        "布隆筛查",
        "Redis 辅助判断",
        "批量确认",
        "批量导入",
        "记录标记"
      ],
      "notes": [
        "读取待导入的白名单，保留每条记录的处理结果。",
        "布隆过滤器快速筛查。命中表示可能已存在，不直接当作已存在。",
        "布隆过滤器与 Redis 配合处理存在性判断，整理需要进一步确认的候选记录。",
        "MySQL 批量确认实际已存在的记录。示例中的 W04 为布隆误判，仍属于新增。",
        "对新增记录进行 MySQL 批处理；已有记录保留原有数据，不重复插入。",
        "逐条标记已存在或已导入，展示本次名单导入的处理结果。"
      ],
      "records": [
        {
          "id": "W01",
          "bits": [
            1,
            4,
            7
          ]
        },
        {
          "id": "W02",
          "bits": [
            3,
            6,
            11
          ]
        },
        {
          "id": "W03",
          "bits": [
            2,
            4,
            9
          ]
        },
        {
          "id": "W04",
          "bits": [
            1,
            4,
            9
          ]
        },
        {
          "id": "W05",
          "bits": [
            5,
            10,
            14
          ]
        },
        {
          "id": "W06",
          "bits": [
            0,
            8,
            12
          ]
        }
      ],
      "existing": [
        {
          "id": "W01",
          "bits": [
            1,
            4,
            7
          ]
        },
        {
          "id": "W03",
          "bits": [
            2,
            4,
            9
          ]
        },
        {
          "id": "W07",
          "bits": [
            7,
            9,
            13
          ]
        }
      ]
    }
  },
  {
    "optimization": null,
    "flow": {
      "title": "用户筛选、产品匹配与流量分发",
      "nodes": [
        "用户信息",
        "风控结果",
        "商户规则",
        "推荐产品",
        "流量分发"
      ],
      "notes": [
        "根据用户信息与后台条件筛选用户。",
        "结合风控结果确定可推荐范围。",
        "读取商户的产品推送与申请规则。",
        "匹配符合条件的产品。",
        "通过 SaaS / CRM 服务对接完成流量协作，后续状态与通知异步处理。"
      ]
    },
    "database": "优化存量代码、查询和多线程逻辑，缓解数据库高负载；缓存热点用户数据。",
    "focus": {
      "title": "配合业务设计，提取并分析贷款转化数据",
      "context": "与项目组、运营人员配合，从注册到放款逐步统计业务数据，通过漏斗查看各环节的转化。",
      "contribution": "结合业务提出设计想法，协助数据分析与提取，形成注册、认证、产品列表、试算、下单与放款的漏斗。"
    },
    "technical": "",
    "graph": {
      "nodes": [
        {
          "id": "in",
          "label": "用户",
          "x": 55,
          "y": 130
        },
        {
          "id": "risk",
          "label": "风控结果",
          "x": 175,
          "y": 65
        },
        {
          "id": "rule",
          "label": "商户规则",
          "x": 300,
          "y": 130
        },
        {
          "id": "product",
          "label": "推荐产品",
          "x": 425,
          "y": 130
        },
        {
          "id": "crm",
          "label": "SaaS / CRM",
          "x": 550,
          "y": 130
        },
        {
          "id": "admin",
          "label": "后台调规则",
          "x": 300,
          "y": 200
        }
      ],
      "edges": [
        [
          "in",
          "risk"
        ],
        [
          "risk",
          "rule"
        ],
        [
          "rule",
          "product"
        ],
        [
          "product",
          "crm"
        ],
        [
          "admin",
          "rule"
        ]
      ],
      "route": [
        "in",
        "risk",
        "rule",
        "product",
        "crm"
      ]
    },
    "funnel": {
      "title": "从注册到放款的八个业务节点",
      "nodes": [
        "注册数",
        "注册成功数",
        "认证数量",
        "认证成功数量",
        "产品列表",
        "试算数",
        "下单数",
        "放款数"
      ],
      "values": [
        1000,
        920,
        760,
        640,
        570,
        420,
        280,
        160
      ],
      "notes": [
        "统计注册数，作为这一批示例数据的起点。",
        "查看注册成功数，与注册数进行比较。",
        "统计进入认证的数量。",
        "查看认证成功数量，与认证数量进行比较。",
        "查看产品列表阶段的数据。",
        "统计试算数，观察产品列表到试算的转化。",
        "统计下单数，观察试算到下单的转化。",
        "统计放款数，与下单数及起始注册数进行比较。"
      ]
    }
  },
  {
    "optimization": null,
    "flow": {
      "title": "多端内容与社区互动走同一套业务接口",
      "nodes": [
        "Flutter 多端",
        "课程与资讯",
        "付费内容",
        "评论与点赞",
        "消息分发"
      ],
      "notes": [
        "Flutter 前端适配多端，统一对接 Spring Boot 业务接口。",
        "用户浏览课程与资讯。",
        "用户付费获取专业内容。",
        "处理评论、点赞等互动。",
        "RabbitMQ 分发非即时通知，内容与互动流程由前后端共同完成。"
      ]
    },
    "database": "缓存固定配置、图片和热点数据，减少重复读取与 OSS 请求。",
    "focus": {
      "title": "独立完成前后端，Flutter 适配多端",
      "context": "牛圈提供课程、资讯、付费内容与社区互动功能。前端使用 Flutter，后端基于 Spring Boot、MyBatis、Redis 和 RabbitMQ。",
      "contribution": "独立完成前后端开发，对接页面与业务接口，并使用 Flutter 适配多端。"
    },
    "technical": "",
    "graph": {
      "nodes": [
        {
          "id": "app",
          "label": "Flutter 多端",
          "x": 55,
          "y": 130
        },
        {
          "id": "content",
          "label": "课程 / 资讯",
          "x": 175,
          "y": 70
        },
        {
          "id": "paid",
          "label": "付费内容",
          "x": 300,
          "y": 130
        },
        {
          "id": "community",
          "label": "评论 / 点赞",
          "x": 425,
          "y": 70
        },
        {
          "id": "notice",
          "label": "消息队列",
          "x": 550,
          "y": 130
        },
        {
          "id": "api",
          "label": "Spring Boot",
          "x": 300,
          "y": 205
        }
      ],
      "edges": [
        [
          "app",
          "content"
        ],
        [
          "content",
          "paid"
        ],
        [
          "paid",
          "community"
        ],
        [
          "community",
          "notice"
        ],
        [
          "api",
          "content"
        ],
        [
          "api",
          "community"
        ]
      ],
      "route": [
        "app",
        "content",
        "paid",
        "community",
        "notice"
      ]
    },
    "fullstack": {
      "title": "一套业务，从后端接口到多端页面",
      "nodes": [
        "多端页面",
        "Flutter 请求",
        "Spring Boot 接口",
        "后端处理",
        "内容回显"
      ],
      "notes": [
        "同一份课程内容在不同屏幕尺寸下调整布局，展示 Flutter 多端适配。",
        "Flutter 页面发起业务请求，获取课程内容。",
        "Spring Boot 接口接收请求，连接前端页面与后端业务。",
        "MyBatis 承接数据访问，Redis 用于缓存，RabbitMQ 分发非即时通知；下图按职责展示，并非每次查询都会经过全部组件。",
        "接口返回内容后，多端页面分别完成回显，前后端开发由一人完成。"
      ]
    }
  },
  {
    "optimization": null,
    "flow": {
      "title": "用户选定档期，订单再对接在线课堂",
      "nodes": [
        "老师与档期",
        "提交约课",
        "约课订单",
        "第三方课堂",
        "订单与课程提醒"
      ],
      "notes": [
        "查看老师、档期与教材信息。",
        "用户选择老师和时间后提交约课。",
        "服务端处理约课订单。",
        "将订单对接第三方在线视频教育平台，安排上课。",
        "JPush 推送订单状态和课程更新。"
      ]
    },
    "database": "使用 Redis 缓存老师列表、档期等热点内容。",
    "focus": {
      "title": "主动排查短信接口风险，加入两层请求限制",
      "context": "排查系统风险时发现短信接口可能被恶意请求，加入令牌桶与时间窗口机制，限制短信发送。",
      "contribution": "主动排查并处理短信接口风险：令牌桶控制短时突发请求，时间窗口限制窗口内的累计发送。"
    },
    "technical": "",
    "graph": {
      "nodes": [
        {
          "id": "teacher",
          "label": "老师 / 档期",
          "x": 55,
          "y": 130
        },
        {
          "id": "apply",
          "label": "用户约课",
          "x": 175,
          "y": 65
        },
        {
          "id": "order",
          "label": "约课订单",
          "x": 300,
          "y": 130
        },
        {
          "id": "room",
          "label": "在线视频",
          "x": 425,
          "y": 65
        },
        {
          "id": "push",
          "label": "JPush 提醒",
          "x": 550,
          "y": 130
        },
        {
          "id": "materials",
          "label": "教材 / 论坛",
          "x": 55,
          "y": 215
        }
      ],
      "edges": [
        [
          "teacher",
          "apply"
        ],
        [
          "apply",
          "order"
        ],
        [
          "order",
          "room"
        ],
        [
          "room",
          "push"
        ],
        [
          "teacher",
          "materials"
        ]
      ],
      "route": [
        "teacher",
        "apply",
        "order",
        "room",
        "push"
      ]
    },
    "sms": {
      "title": "短信接口：突发请求与窗口累计分别受限",
      "nodes": [
        "排查接口风险",
        "正常请求放行",
        "令牌耗尽拦截",
        "窗口达到上限",
        "限制恢复",
        "示例结果"
      ],
      "notes": [
        "主动排查短信接口的恶意请求风险，加入令牌桶和时间窗口限制。",
        "示例连续放行三个请求，每次发送消耗一个令牌，同时累计窗口内已放行数量。",
        "令牌耗尽，紧接着的请求被拦截，不再调用短信发送。",
        "稍后补充一个令牌，但当前时间窗口已达到累计上限；仍然拦截，防止持续请求。",
        "示例推进到窗口限制解除、令牌已补充的时刻，后续正常请求可以再次发送。",
        "这一组示例共放行四次、拦截两次，分别展示令牌桶和时间窗口的作用。"
      ],
      "frames": [
        {
          "time": "开始",
          "tokens": 3,
          "count": 0,
          "sent": 0,
          "blocked": 0,
          "status": "等待请求",
          "reason": "观察两种限制的状态"
        },
        {
          "time": "连续三个请求",
          "tokens": 0,
          "count": 3,
          "sent": 3,
          "blocked": 0,
          "status": "放行 × 3",
          "reason": "有令牌，窗口额度也未超限"
        },
        {
          "time": "紧接着的请求",
          "tokens": 0,
          "count": 3,
          "sent": 3,
          "blocked": 1,
          "status": "拦截",
          "reason": "令牌桶已空"
        },
        {
          "time": "补充一个令牌后",
          "tokens": 1,
          "count": 3,
          "sent": 3,
          "blocked": 2,
          "status": "拦截",
          "reason": "令牌可用，但时间窗口已满"
        },
        {
          "time": "窗口限制解除后",
          "tokens": 2,
          "count": 1,
          "sent": 4,
          "blocked": 2,
          "status": "放行",
          "reason": "令牌和窗口额度均可用"
        },
        {
          "time": "演示结束",
          "tokens": 2,
          "count": 1,
          "sent": 4,
          "blocked": 2,
          "status": "4 次发送 / 2 次拦截",
          "reason": "两种规则分别拦截不同请求"
        }
      ]
    }
  },
  {
    "optimization": null,
    "flow": {
      "title": "一条客资如何到达员工并继续跟进",
      "nodes": [
        "客资收集",
        "按类型管理",
        "队列分配",
        "员工跟进",
        "到店变更通知"
      ],
      "notes": [
        "收集不同渠道的影楼客户资料。",
        "按客资类型分模块管理，并结合权限处理。",
        "通过 RabbitMQ 处理客户资源分发与分配。",
        "负责员工跟进客户。",
        "到店时间等变更通过 RabbitMQ + WebSocket 通知员工；渠道报表用于统计来源与投入。"
      ]
    },
    "database": "优化报表查询，支持客资分配与渠道统计。",
    "focus": {
      "title": "WebSocket 通讯改造与用户连接登记",
      "context": "外部第三方即时通讯改为 RabbitMQ + Netty WebSocket。消息按 userId 发布，各实例接收后向对应用户推送；多窗口可能连接不同实例，使同一用户收到多份相同通知。",
      "contribution": "在 Netty 建立连接时增加用户连接缓存标识：没有标识时正常登记，已有标识时静默跳过；已登记连接失效后清除标识。"
    },
    "technical": "",
    "graph": {
      "nodes": [
        {
          "id": "lead",
          "label": "渠道客资",
          "x": 55,
          "y": 130
        },
        {
          "id": "type",
          "label": "按类型管理",
          "x": 175,
          "y": 65
        },
        {
          "id": "mq",
          "label": "分配队列",
          "x": 300,
          "y": 130
        },
        {
          "id": "staff",
          "label": "负责员工",
          "x": 425,
          "y": 65
        },
        {
          "id": "update",
          "label": "到店通知",
          "x": 550,
          "y": 130
        },
        {
          "id": "report",
          "label": "渠道报表",
          "x": 175,
          "y": 215
        }
      ],
      "edges": [
        [
          "lead",
          "type"
        ],
        [
          "type",
          "mq"
        ],
        [
          "mq",
          "staff"
        ],
        [
          "staff",
          "update"
        ],
        [
          "type",
          "report"
        ]
      ],
      "route": [
        "lead",
        "type",
        "mq",
        "staff",
        "update"
      ]
    },
    "websocket": {
      "title": "多实例下，按用户登记一个推送连接",
      "nodes": [
        "多窗口连接",
        "重复消息",
        "首个连接登记",
        "后续连接忽略",
        "单连接推送",
        "连接失效清理",
        "新连接登记"
      ],
      "notes": [
        "同一用户打开三个窗口，分别连接不同实例。",
        "RabbitMQ 将同一条通知分发到各实例，各实例按 userId 推送，用户在多个窗口收到相同通知。",
        "加入连接登记规则：首次建立连接时，没有用户缓存标识，正常添加标识并登记推送连接。",
        "后续窗口连接时发现已有用户标识，静默跳过登记。",
        "RabbitMQ 仍向各实例分发消息，仅已登记连接参与该用户的推送。",
        "已登记连接失效后，清除该用户的连接标识。这里演示的是已登记连接失效。",
        "缓存标识已清除，后续新建的连接可以正常登记；已有窗口不会在这个演示中自动接管。"
      ],
      "before": [
        "// 改造前：多窗口分别登记在不同实例",
        "onConnect(userId, connection) {",
        "  registerLocal(userId, connection);",
        "}",
        "onQueueMessage(message) {",
        "  pushToLocalUser(message.userId, message);",
        "}"
      ],
      "after": [
        "// 连接登记逻辑示意，非项目历史源码",
        "onConnect(userId, connection) {",
        "  if (connectionCache.contains(userId)) return;",
        "  connectionCache.add(userId, connection.id);",
        "  registerLocal(userId, connection);",
        "}",
        "onRegisteredConnectionClosed(userId, connection) {",
        "  clearRegistration(userId, connection.id);",
        "}",
        "onQueueMessage(message) {",
        "  pushToRegisteredUser(message.userId, message);",
        "}"
      ]
    }
  },
  null
];
