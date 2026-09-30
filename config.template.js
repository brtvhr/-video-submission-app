/**
 * 配置文件模板 - 请勿直接修改此文件
 * 部署时 Vercel 会自动用环境变量替换占位符，生成 config.js
 * 本地开发：复制为 config.js 并手动填入实际值
 */

var APP_CONFIG = {
    supabaseUrl: 'SUPABASE_URL_PLACEHOLDER',
    supabaseKey: 'SUPABASE_KEY_PLACEHOLDER',
    accessCode: 'ACCESS_CODE_PLACEHOLDER',

    units: [
        '抖音', '快手', '微博', '百度', '微信', '小红书',
        'BRTV',
        '东城区', '西城区', '朝阳区', '海淀区', '丰台区',
        '石景山区', '门头沟区', '房山区', '通州区', '顺义区',
        '昌平区', '大兴区', '平谷区', '怀柔区', '密云区', '延庆区', '经开区'
    ],

    platforms: [
        '抖音', '快手', '微博', '百度', '微信', '小红书'
    ]
};
