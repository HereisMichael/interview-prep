export const TAG_KEYS = {
  position: '岗位',
  industry: '行业',
  company: '公司',
  skill: '技能',
} as const;

export const PRESET_TAGS = {
  position: ['SA', '解决方案架构师', '售前架构师', '产品经理', '技术顾问'],
  industry: ['医疗', '教育', '金融', '零售', '制造', '通用', '政务'],
  company: ['阿里云', '华为云', '腾讯云', 'AWS', 'Azure', '通用'],
  skill: ['微服务', '大数据', 'AI', '云计算', '安全', '数据库', '容器化', 'DevOps', '高可用', '分布式'],
} as const;

export const TAG_COLORS: Record<string, string> = {
  SA: 'blue',
  '解决方案架构师': 'blue',
  售前架构师: 'blue',
  产品经理: 'magenta',
  医疗: 'green',
  教育: 'cyan',
  金融: 'gold',
  零售: 'volcano',
  制造: 'geekblue',
  政务: 'purple',
  通用: 'default',
  阿里云: 'orange',
  华为云: 'red',
  腾讯云: 'geekblue',
  AWS: 'volcano',
  AI: 'purple',
  微服务: 'lime',
  大数据: 'geekblue',
  云计算: 'blue',
  安全: 'red',
  数据库: 'cyan',
  容器化: 'volcano',
  DevOps: 'green',
  高可用: 'gold',
  分布式: 'magenta',
};
