const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'ui', 'dist');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            results.push(file);
        }
    });
    return results;
}

const websiteDomain = process.env.WEBSITE_DOMAIN || '';
const mailgunDomain = process.env.MAILGUN_EMAIL_DOMAIN || process.env.EMAIL_DOMAIN || '';

console.log(`Applying environment variables to UI build:`);
console.log(`WEBSITE_DOMAIN: ${websiteDomain}`);
console.log(`MAILGUN_EMAIL_DOMAIN: ${mailgunDomain}`);

if (!fs.existsSync(distDir)) {
    console.error('ui/dist directory not found!');
    process.exit(1);
}

const files = walk(distDir);
files.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.html')) {
        let content = fs.readFileSync(file, 'utf8');
        let changed = false;

        if (content.includes('${WEBSITE_DOMAIN}')) {
            content = content.replace(/\$\{WEBSITE_DOMAIN\}/g, websiteDomain);
            changed = true;
        }

        if (content.includes('${MAILGUN_EMAIL_DOMAIN}')) {
            content = content.replace(/\$\{MAILGUN_EMAIL_DOMAIN\}/g, mailgunDomain);
            changed = true;
        }

        if (changed) {
            console.log(`Updated: ${file}`);
            fs.writeFileSync(file, content, 'utf8');
        }
    }
});

console.log('UI environment variables applied successfully.');
