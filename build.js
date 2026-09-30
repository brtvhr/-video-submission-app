const fs = require('fs');
const content = fs.readFileSync('config.template.js', 'utf8')
  .replace('SUPABASE_URL_PLACEHOLDER', process.env.SUPABASE_URL || '')
  .replace('SUPABASE_KEY_PLACEHOLDER', process.env.SUPABASE_KEY || '')
  .replace('ACCESS_CODE_PLACEHOLDER', process.env.ACCESS_CODE || 'video2024');
fs.writeFileSync('config.js', content);
console.log('✅ config.js generated successfully');
