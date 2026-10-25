import { AlarmClock, ChartCandlestick, ChartLine, Mail } from 'lucide-react'

/* Shared by every signed-out page: the hero on the left (hidden on mobile) and
 * the form column on the right. */
export default function AuthLayout({ children }) {
  return (
    <div className="auth">
      <section className="hero">
        <div className="brand" style={{ padding: 0 }}><div className="logo"><ChartCandlestick size={18} /></div>StockTracker</div>
        <div>
          <div className="eyebrow"><span className="dot" />Cotações da B3</div>
          <h2>Acompanhe a B3 e <span className="grad">nunca perca um <span className="nowrap">preço-alvo.</span></span></h2>
          <p>Watchlist pessoal, alertas de preço com webhook, notificações no app e resumo periódico por e-mail.</p>
          <div className="feat">
            <div className="card"><div className="chip blue"><ChartLine size={20} /></div><b>Cotações</b><div className="muted small" style={{ marginTop: 4 }}>Atualizadas a cada minuto</div></div>
            <div className="card"><div className="chip amber"><AlarmClock size={20} /></div><b>Alertas</b><div className="muted small" style={{ marginTop: 4 }}>Verificados a cada minuto</div></div>
            <div className="card"><div className="chip sky"><Mail size={20} /></div><b>Resumo</b><div className="muted small" style={{ marginTop: 4 }}>Diário, semanal ou mensal</div></div>
          </div>
        </div>
        <div className="muted small">Dados de mercado: brapi.dev</div>
      </section>

      <section className="auth-form">{children}</section>
    </div>
  )
}

/* The brand line the form shows in place of the hero on small screens. */
export function AuthLogo() {
  return <div className="mlogo"><div className="logo"><ChartCandlestick size={18} /></div>StockTracker</div>
}
