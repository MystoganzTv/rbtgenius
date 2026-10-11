import { readFileSync, writeFileSync } from 'node:fs';
const files = ['question-bank.js', 'question-bank-official-expansion.js', 'concept-task-list-map.js', 'task-list.js', 'question-translations-es.json'];
const check = process.argv.includes('--check');
for (const file of files) {
  const source = readFileSync(new URL(`../shared/questions/${file}`, import.meta.url), 'utf8');
  for (const dir of ['src/lib/questions', 'mobile/src/lib/questions']) {
    const target = new URL(`../${dir}/${file}`, import.meta.url);
    if (check) {
      if (readFileSync(target, 'utf8') !== source) throw new Error(`${dir}/${file} is out of date. Run npm run sync:questions.`);
    } else writeFileSync(target, source);
  }
}
console.log(check ? 'Question copies match their canonical source.' : 'Question copies updated.');
