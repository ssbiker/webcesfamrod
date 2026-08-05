const fs = require('fs');
const path = 'src/components/avisos/AvisosKanban.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/Ã¡/g, 'á');
content = content.replace(/Ã©/g, 'é');
content = content.replace(/Ã³/g, 'ó');
content = content.replace(/Ã­/g, 'í');
content = content.replace(/Ãº/g, 'ú');
content = content.replace(/Ã±/g, 'ñ');
content = content.replace(/Â¿/g, '¿');
content = content.replace(/Â/g, ''); 
content = content.replace(//g, ''); 

fs.writeFileSync(path, content, 'utf8');
