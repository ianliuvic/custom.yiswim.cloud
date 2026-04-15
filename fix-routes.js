const fs = require('fs');
['routes/apiRoutes.js', 'routes/adminRoutes.js'].forEach(f => {
    let content = fs.readFileSync(f, 'utf-8');
    const count = (content.match(/'\u670d\u52a1\u5668\u9519\u8bef'/g) || []).length;
    content = content.replace(/'\u670d\u52a1\u5668\u9519\u8bef'/g, "'Server error'");
    fs.writeFileSync(f, content, 'utf-8');
    console.log(f + ': replaced ' + count + ' occurrences');
});
