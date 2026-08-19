import { EmbedBuilder } from 'discord.js';
import { fetchRecentClients, fetchStats, createClient } from '../db.js';

export const commands = {
  ping: {
    description: 'Verifica a latência do bot e da API',
    async execute(message) {
      const latency = Date.now() - message.createdTimestamp;
      const embed = new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .setDescription(`Latência: **${latency}ms** | API: **Online** ✅`)
        .setColor(0x5865F2);
      await message.reply({ embeds: [embed] });
    },
  },

  clientes: {
    description: 'Lista os últimos clientes cadastrados no CRM. Uso: !clientes [quantidade]',
    async execute(message, args) {
      const limit = Math.min(parseInt(args[0]) || 5, 10);
      const clients = await fetchRecentClients(limit);
      if (!clients.length) return message.reply('📋 Nenhum cliente encontrado no CRM.');

      const embed = new EmbedBuilder()
        .setTitle('📋 Últimos Clientes no CRM')
        .setDescription(`Exibindo **${clients.length}** clientes:`)
        .setColor(0x57F287);

      for (const c of clients) {
        embed.addFields({
          name: `#${c.id} — ${c.name}`,
          value: `📧 ${c.email || 'N/A'} | 📞 ${c.phone || 'N/A'} | 🏢 ${c.company || 'N/A'} | Status: \`${c.status}\``,
          inline: false,
        });
      }
      embed.setFooter({ text: 'CRM System · Blaze Host' });
      await message.reply({ embeds: [embed] });
    },
  },

  stats: {
    description: 'Exibe as estatísticas gerais do CRM',
    async execute(message) {
      const data = await fetchStats();
      const embed = new EmbedBuilder()
        .setTitle('📊 Estatísticas do CRM')
        .setColor(0xEB459E)
        .addFields(
          { name: '👥 Clientes', value: String(data.clients), inline: true },
          { name: '💼 Oportunidades', value: String(data.opportunities), inline: true },
          { name: '💬 Interações', value: String(data.interactions), inline: true }
        )
        .setFooter({ text: 'Aiven Cloud MySQL · Status Online' });
      await message.reply({ embeds: [embed] });
    },
  },

  addcliente: {
    description: 'Cadastra cliente. Uso: !addcliente Nome email@exemplo.com [fone] [empresa]',
    async execute(message, args) {
      const [nome, email, phone, company] = args;
      if (!nome || !email) return message.reply('❌ Uso: `!addcliente Nome email@exemplo.com`');

      const clientId = await createClient(nome, email, phone || null, company || null);
      const embed = new EmbedBuilder()
        .setTitle('✅ Cliente Cadastrado!')
        .setColor(0x57F287)
        .addFields(
          { name: 'ID', value: `#${clientId}`, inline: true },
          { name: 'Nome', value: nome, inline: true },
          { name: 'Email', value: email, inline: true }
        );
      if (company) embed.addFields({ name: 'Empresa', value: company, inline: true });
      await message.reply({ embeds: [embed] });
    },
  },

  help: {
    description: 'Mostra todos os comandos disponíveis',
    async execute(message) {
      const embed = new EmbedBuilder()
        .setTitle('📖 Comandos do CRM Bot')
        .setColor(0xFEE75C)
        .addFields(
          { name: '!ping', value: 'Verifica latência do bot', inline: false },
          { name: '!clientes [n]', value: 'Lista os últimos N clientes (padrão: 5)', inline: false },
          { name: '!stats', value: 'Exibe estatísticas do CRM', inline: false },
          { name: '!addcliente Nome email [fone] [empresa]', value: 'Cadastra um novo cliente', inline: false },
        );
      await message.reply({ embeds: [embed] });
    },
  },
};
