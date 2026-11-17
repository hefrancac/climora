import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Building2, CalendarCheck, Check, CloudRain, Droplets, MapPin, Search, Smartphone, Snowflake, Sprout, Tractor, Users, Wheat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Brand, CONTACT_EMAIL, PlantingLines } from '@/components/brand';
import { CROPS } from '@/lib/crops';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'Climora · Saiba quando plantar e quando vai colher' },
    { name: 'description', content: 'Diga o que quer plantar e veja as melhores épocas de plantio no seu município, com a data prevista da colheita. Grátis para produtores.' },
    { property: 'og:title', content: 'Climora · Saiba quando plantar e quando vai colher' },
    { property: 'og:description', content: 'Melhores épocas de plantio pelo clima do seu município, com colheita prevista.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Landing,
});

const steps = [
  { icon: MapPin, title: 'Escolha o município', text: 'O Climora busca 10 anos de clima da sua região: temperatura, chuva, evaporação e geadas.' },
  { icon: Search, title: 'Diga o que quer plantar', text: `Mais de ${Math.floor(CROPS.length / 10) * 10} culturas, de alface a café. Não achou? Cadastre a sua em segundos.` },
  { icon: CalendarCheck, title: 'Veja as melhores épocas', text: 'Até três opções de período de plantio, cada uma com a data prevista da colheita e o porquê.' },
];

const features = [
  { icon: Sprout, title: 'Época pelo clima da sua região', text: 'Nada de calendário genérico: a análise usa o histórico do seu município.' },
  { icon: Wheat, title: 'Colheita prevista de verdade', text: 'No frio a planta demora mais. A data da colheita muda conforme a época do plantio.' },
  { icon: Droplets, title: 'Com ou sem irrigação', text: 'Veja o que muda quando há água garantida e quando tudo depende da chuva.' },
  { icon: Snowflake, title: 'Riscos explicados', text: 'Geada, falta de chuva, calor demais e chuva na colheita, em palavras simples.' },
  { icon: CalendarCheck, title: 'Minhas plantações', text: 'Salve o plantio e acompanhe quanto falta para colher.' },
  { icon: CloudRain, title: 'Colheita sem susto', text: 'Perto da colheita, a chuva hora a hora e o horário mais seco para colher e entregar.' },
];

const audiences = [
  { icon: Tractor, title: 'Produtor', price: 'Grátis', items: ['Melhores épocas de plantio para qualquer cultura', 'Colheita prevista e acompanhamento', 'Chuva hora a hora na colheita', 'WhatsApp, calendário e backup'], cta: 'Começar agora', to: '/app' as const },
  { icon: Users, title: 'Cooperativas e associações', price: 'Em breve', items: ['Calendário de plantio dos associados', 'Previsão de oferta por mês para vender melhor', 'Organização de PNAE, PAA e feiras', 'Alertas de risco climático'], cta: 'Quero participar do piloto', mail: 'Piloto para cooperativa' },
  { icon: Building2, title: 'Prefeituras e ATER', price: 'Parceria', items: ['Apoio técnico aos agricultores atendidos', 'Visão regional de épocas e riscos', 'Material de capacitação', 'Implantação acompanhada'], cta: 'Falar com a equipe', mail: 'Parceria institucional' },
];

const faq = [
  { q: 'Como o Climora sabe a melhor época?', a: 'Ele monta um ano típico do seu município com 10 anos de clima diário e simula a cultura plantada em cada data: temperatura em relação à faixa ideal, chuva frente à necessidade de água, risco de geada e chuva na colheita. As datas com menos risco viram as opções.' },
  { q: 'Serve para qualquer cultura?', a: 'Há mais de 70 culturas cadastradas, entre hortaliças, grãos, raízes e frutas. Se a sua não estiver na lista, cadastre com o ciclo e o tipo de planta parecido.' },
  { q: 'Substitui o Zoneamento Agrícola (ZARC)?', a: 'Não. Para crédito rural e seguro agrícola vale o ZARC do Ministério da Agricultura. O Climora é um apoio prático para o dia a dia, inclusive para culturas que o ZARC não cobre.' },
  { q: 'Quanto custa para o produtor?', a: 'Nada. O planejamento, a previsão e os alertas são gratuitos para quem produz. Os planos pagos são para organizações que acompanham muitos produtores.' },
  { q: 'Preciso de internet o tempo todo?', a: 'Não. Depois de instalado, o app abre sem sinal e mostra o último clima e a última previsão salvos.' },
  { q: 'Onde ficam os meus dados?', a: 'No seu próprio aparelho. Você pode baixar um backup e restaurar em outro celular a qualquer momento.' },
  { q: 'De onde vêm os dados?', a: 'Do Open-Meteo: histórico climático (reanálise ERA5) para as épocas de plantio e previsão hora a hora para a colheita.' },
];

function Landing() {
  return <div className="landing">
    <header className="app-header landing-hero">
      <PlantingLines />
      <nav className="landing-nav" aria-label="Principal">
        <Brand />
        <div className="landing-links"><a href="#como-funciona">Como funciona</a><a href="#para-quem">Para quem</a><a href="#perguntas">Perguntas</a></div>
        <Button variant="masthead" asChild><Link to="/app">Abrir o app</Link></Button>
      </nav>
      <div className="hero-inner">
        <div className="hero-copy">
          <p className="hero-kicker"><span className="demo-dot" />Para a agricultura familiar</p>
          <h1>Saiba quando plantar.<br />E quando vai colher.</h1>
          <p className="hero-lead">Diga o que você quer plantar. O Climora analisa 10 anos de clima do seu município e mostra as melhores épocas de plantio, com a data prevista da colheita.</p>
          <div className="hero-ctas">
            <Button variant="masthead" size="lg" asChild><Link to="/app">Planejar meu plantio<ArrowRight /></Link></Button>
            <a className="hero-secondary" href="#como-funciona">Ver como funciona</a>
          </div>
          <ul className="hero-points"><li><Check size={16} />Qualquer cultura</li><li><Check size={16} />Clima do seu município</li><li><Check size={16} />Grátis para produtores</li></ul>
        </div>
        <div className="hero-preview" aria-hidden="true">
          <p className="preview-label">Exemplo ilustrativo: feijão sem irrigação</p>
          <article className="season-card r-otima">
            <div className="season-top"><span className="season-rank">1ª opção</span><span className="rating-chip r-otima">Ótima · 92</span></div>
            <div className="season-dates">
              <div><span className="season-label"><Sprout size={15} />Plantar</span><strong>10 fev 2027</strong><span className="season-to">até 16 mar 2027</span></div>
              <div><span className="season-label"><Wheat size={15} />Colher</span><strong>20 abr 2027</strong><span className="season-to">até 7 jun 2027</span></div>
            </div>
            <ul className="reasons">
              <li className="ok"><Check size={15} /><span>Temperatura média de 22 °C no ciclo (ideal 18–26 °C)</span></li>
              <li className="ok"><Check size={15} /><span>Chuva esperada de 310 mm para uma necessidade de ~280 mm</span></li>
              <li className="ok"><Check size={15} /><span>Colheita em período mais seco</span></li>
              <li className="ok"><Check size={15} /><span>Sem registro de geada no período</span></li>
            </ul>
          </article>
        </div>
      </div>
    </header>

    <main>
      <section className="landing-section problem">
        <div className="section-inner narrow">
          <h2>Plantar fora de época custa a safra.</h2>
          <p>Feijão que floresce no calor seco, tomate pego pela geada, milho colhido debaixo de chuva. O calendário que vem no pacote da semente vale para o Brasil inteiro; o que importa é <strong>o clima do seu município</strong>, com ou sem irrigação.</p>
        </div>
      </section>

      <section className="landing-section" id="como-funciona">
        <div className="section-inner">
          <p className="eyebrow">Como funciona</p>
          <h2>Três passos, menos de um minuto</h2>
          <ol className="steps">{steps.map((s, i) => <li key={s.title}><span className="step-num">{i + 1}</span><s.icon /><h3>{s.title}</h3><p>{s.text}</p></li>)}</ol>
        </div>
      </section>

      <section className="landing-section alt">
        <div className="section-inner">
          <p className="eyebrow">Recursos</p>
          <h2>Do planejamento do plantio à colheita</h2>
          <div className="feature-grid">{features.map(f => <article key={f.title} className="feature"><f.icon /><h3>{f.title}</h3><p>{f.text}</p></article>)}</div>
        </div>
      </section>

      <section className="landing-section" id="para-quem">
        <div className="section-inner">
          <p className="eyebrow">Para quem</p>
          <h2>Grátis para quem produz. Ferramentas para quem organiza.</h2>
          <div className="plans">{audiences.map(a => <article key={a.title} className={`plan-tier${a.to ? ' featured' : ''}`}>
            <a.icon /><h3>{a.title}</h3><p className="tier-price">{a.price}</p>
            <ul>{a.items.map(item => <li key={item}><Check size={15} />{item}</li>)}</ul>
            {a.to ? <Button asChild size="lg"><Link to={a.to}>{a.cta}<ArrowRight /></Link></Button>
              : <Button variant="outline" size="lg" asChild><a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Climora · ${a.mail}`)}`}>{a.cta}</a></Button>}
          </article>)}</div>
        </div>
      </section>

      <section className="landing-section alt" id="perguntas">
        <div className="section-inner narrow">
          <p className="eyebrow">Perguntas frequentes</p>
          <h2>Dúvidas comuns</h2>
          <div className="faq">{faq.map(f => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="section-inner narrow">
          <Smartphone />
          <h2>O que você vai plantar agora?</h2>
          <p>Abra no celular, escolha o município e a cultura. Para instalar, use “Adicionar à tela inicial” no navegador.</p>
          <Button variant="masthead" size="lg" asChild><Link to="/app">Planejar meu plantio<ArrowRight /></Link></Button>
        </div>
      </section>
    </main>

    <footer className="landing-footer">
      <div className="section-inner">
        <Brand />
        <p>Clima e previsão: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo.com</a> (CC BY 4.0). As épocas são estimativas a partir do clima histórico e de parâmetros gerais das culturas; para crédito e seguro rural vale o ZARC. Confirme com a assistência técnica da sua região.</p>
        <p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
      </div>
    </footer>
  </div>;
}
