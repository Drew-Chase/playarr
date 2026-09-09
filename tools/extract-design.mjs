#!/usr/bin/env node
// Unpacks the design source from the bundled `Playarr TV.html` into design/:
//   design/template.html  — the <x-dc> markup
//   design/logic.js       — the data-dc-script app logic (constants + state machine)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'Playarr TV.html'), 'utf8');

const T = '<script type="__bundler/template">';
const ti = html.indexOf(T);
const template = JSON.parse(html.slice(ti + T.length, html.indexOf('</' + 'script>', ti + T.length)).trim());

const xcOpen = /<x-dc(?:\s[^>]*)?>/.exec(template);
const xcClose = template.lastIndexOf('</x-dc>');
const markup = template.slice(xcOpen.index + xcOpen[0].length, xcClose);

const sc = /<script type="text\/x-dc" data-dc-script[^>]*>/.exec(template);
const logic = template.slice(sc.index + sc[0].length, template.indexOf('</' + 'script>', sc.index));

mkdirSync(join(root, 'design'), { recursive: true });
writeFileSync(join(root, 'design', 'template.html'), markup.trim() + '\n');
writeFileSync(join(root, 'design', 'logic.js'), logic.trim() + '\n');
console.log('design/template.html', markup.length, 'chars | design/logic.js', logic.length, 'chars');
