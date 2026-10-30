import fs from 'node:fs';
const root=new URL('../',import.meta.url),fixture=JSON.parse(fs.readFileSync(new URL('demo/scenario.json',root),'utf8'));
fs.mkdirSync(new URL('public/demo/',root),{recursive:true});
fs.writeFileSync(new URL('public/demo/reference.txt',root),`虚构演示资料 ${fixture.reference.id}\n本资料仅供验证界面、引用与执行流程，不是工程规范或评审标准。\n\n${fixture.reference.text}\n`,'utf8');
