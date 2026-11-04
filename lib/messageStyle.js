// lib/messageStyle.js — Format Pesan Polaris Luxury Minimalist
// Desain berkelas, rapi, dan konsisten di seluruh command bot.

const LINE = '────────────────────────────';

function box({ prefix = 'POLARIS', title, body, footer, statusTag }) {
  const headerTag = statusTag ? ` • ${statusTag}` : '';
  const lines = [
    `╭───「 ${prefix}${headerTag} 」`,
    `│ ◈ *${title}*`,
    `├───────────────────────────`,
  ];

  if (body) {
    const bodyLines = body.split('\n');
    bodyLines.forEach((l) => lines.push(`│ ${l}`));
  }

  if (footer) {
    lines.push(`├───────────────────────────`);
    lines.push(`│ ⌑ ${footer}`);
  }

  lines.push(`╰───────────────────────────`);
  return lines.join('\n');
}

function success(title, body, footer) {
  return box({ statusTag: 'SUCCESS', title, body, footer });
}

function error(title, body, footer) {
  return box({ statusTag: 'ERROR', title, body, footer });
}

function warning(title, body, footer) {
  return box({ statusTag: 'NOTICE', title, body, footer });
}

function info(title, body, footer) {
  return box({ statusTag: 'INFO', title, body, footer });
}

function denied(title, body) {
  return box({ statusTag: 'RESTRICTED', title, body });
}

function usage(commandExample, description) {
  return box({
    statusTag: 'SYNTAX',
    title: 'Format Perintah',
    body: `Cara pakai: \`${commandExample}\`${description ? `\n${description}` : ''}`,
  });
}

function bullet(text) {
  return `◈ ${text}`;
}

module.exports = { box, success, error, warning, info, denied, usage, bullet, LINE };
