import discord
from discord.ext import commands

class CRMCommands(commands.Cog):
    """Cog contendo os comandos interativos do CRM no Discord."""

    def __init__(self, bot):
        self.bot = bot

    @commands.command(name="ping", help="Verifica a latência do bot")
    async def ping(self, ctx):
        latency = round(self.bot.latency * 1000)
        embed = discord.Embed(
            title="🏓 Pong!",
            description=f"Latência do Bot: **{latency}ms**",
            color=discord.Color.blue()
        )
        await ctx.send(embed=embed)

    @commands.command(name="clientes", help="Lista os últimos clientes cadastrados no CRM")
    async def clientes(self, ctx, limit: int = 5):
        api_cog = self.bot.get_cog("APIIntegration")
        if not api_cog:
            await ctx.send("❌ Erro: Cog de integração não encontrada.")
            return

        async with ctx.typing():
            clients = await api_cog.fetch_recent_clients(limit)
            
            if not clients:
                await ctx.send("📋 Nenhum cliente encontrado no CRM.")
                return

            embed = discord.Embed(
                title="📋 Últimos Clientes no CRM",
                description=f"Exibindo os últimos **{len(clients)}** clientes cadastrados:",
                color=discord.Color.green()
            )

            for c in clients:
                field_value = f"📧 Email: {c['email'] or 'N/A'}\n📞 Fone: {c['phone'] or 'N/A'}\n🏢 Empresa: {c['company'] or 'N/A'}\nStatus: `{c['status']}`"
                embed.add_field(
                    name=f"#{c['id']} - {c['name']}",
                    value=field_value,
                    inline=False
                )

            embed.set_footer(text="CRM System · Integração Discord")
            await ctx.send(embed=embed)

    @commands.command(name="stats", help="Exibe as estatísticas gerais do CRM")
    async def stats(self, ctx):
        api_cog = self.bot.get_cog("APIIntegration")
        if not api_cog:
            await ctx.send("❌ Erro: Cog de integração não encontrada.")
            return

        async with ctx.typing():
            stats_data = await api_cog.fetch_crm_stats()

            embed = discord.Embed(
                title="📊 Estatísticas do CRM",
                color=discord.Color.purple()
            )
            embed.add_field(name="👥 Total de Clientes", value=str(stats_data['clients']), inline=True)
            embed.add_field(name="💼 Oportunidades", value=str(stats_data['opportunities']), inline=True)
            embed.add_field(name="💬 Interações", value=str(stats_data['interactions']), inline=True)
            embed.set_footer(text="Banco Aiven Cloud MySQL · Status Online")

            await ctx.send(embed=embed)

    @commands.command(name="addcliente", help="Cadastra cliente. Uso: !addcliente Nome email@exemplo.com (opcional: fone empresa)")
    async def addcliente(self, ctx, nome: str, email: str, phone: str = None, company: str = None):
        api_cog = self.bot.get_cog("APIIntegration")
        if not api_cog:
            await ctx.send("❌ Erro: Cog de integração não encontrada.")
            return

        async with ctx.typing():
            client_id = await api_cog.create_client(nome, email, phone, company)

            embed = discord.Embed(
                title="✅ Cliente Cadastrado com Sucesso!",
                color=discord.Color.green()
            )
            embed.add_field(name="ID", value=f"#{client_id}", inline=True)
            embed.add_field(name="Nome", value=nome, inline=True)
            embed.add_field(name="Email", value=email, inline=True)
            if company:
                embed.add_field(name="Empresa", value=company, inline=True)

            await ctx.send(embed=embed)

async def setup(bot):
    await bot.add_cog(CRMCommands(bot))
