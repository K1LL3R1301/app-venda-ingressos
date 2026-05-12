$prompt = @'
Crie um mapa visual inspirado no Jaguariúna Rodeo Festival, em visão superior de planta de evento.

A estrutura deve seguir esta organização:

1. Palco
- Coloque o palco na parte superior central do mapa.
- O palco deve ser preto ou cinza escuro.
- O palco deve ter formato retangular largo com uma pequena passarela central avançando para baixo, parecendo um palco em T.
- O palco deve ficar acima da Pista Premium.

2. Pista Premium
- Crie um setor chamado Pista Premium.
- Deve ficar logo abaixo do palco, no centro superior.
- Cor laranja.
- Formato grande, levemente irregular ou trapezoidal.
- Deve ocupar a área central próxima ao palco.

3. Arena
- Crie um setor chamado Arena.
- Deve ficar abaixo da Pista Premium, no centro do mapa.
- Cor amarelo/dourado.
- Deve ser um setor grande, maior que a Pista Premium.
- Formato retangular/trapezoidal, com bordas levemente inclinadas.
- Deve ficar conectado visualmente à Pista Premium, mas separado por borda.

4. Camarote Brahma
- Crie um setor grande chamado Camarote Brahma.
- Deve ficar na lateral esquerda do palco e da Pista Premium.
- Cor vermelha forte.
- Formato grande e irregular, levemente inclinado.
- Deve parecer um bloco premium lateral.
- Dentro ou na borda esquerda, crie uma faixa vertical chamada Rancho Brahma, em vermelho escuro.

5. Receptivo Brahma
- Crie um setor chamado Receptivo Brahma.
- Deve ficar abaixo do Camarote Brahma, na lateral esquerda.
- Cor vermelho claro ou vermelho rosado.
- Formato retangular/irregular.
- Deve parecer área de recepção VIP.

6. Corporativo
- Crie um setor chamado Corporativo.
- Deve ficar próximo ao Receptivo Brahma, na parte inferior esquerda do bloco Brahma.
- Cor cinza.
- Formato retangular.
- Deve ficar ao lado ou abaixo do Receptivo Brahma.

7. Camarote Super Bull
- Crie um setor chamado Camarote Super Bull.
- Deve ficar na lateral direita do palco e da Pista Premium.
- Cor azul.
- Formato retangular/trapezoidal inclinado.
- Deve ficar no canto superior direito.
- Deve parecer camarote premium.

8. SB Open
- Crie um setor chamado SB Open.
- Deve ficar abaixo do Camarote Super Bull, na lateral direita.
- Cor roxa.
- Formato vertical ou retangular.
- Deve ficar conectado ao bloco Super Bull.

9. Super Bull
- Crie um setor chamado Super Bull.
- Deve ficar à direita do SB Open ou abaixo do Camarote Super Bull.
- Cor azul escuro.
- Formato retangular.
- Deve compor o bloco de camarotes da lateral direita.

10. Corredores
- Crie corredores cinza claros ou brancos ao redor da Arena e da Pista Premium.
- Crie um corredor lateral esquerdo entre os camarotes Brahma e a Arena.
- Crie um corredor lateral direito entre os camarotes Super Bull e a Arena.
- Crie corredores na parte inferior conectando entrada principal, arena e praça de alimentação.
- Corredores não devem ter setor vinculado e devem usar type AISLE.

11. Entrada Principal
- Crie uma entrada principal na lateral inferior esquerda do mapa.
- Deve parecer um corredor vertical claro.
- Deve estar conectada aos corredores que levam à Arena, Praça de Alimentação e camarotes.

12. Praça de Alimentação
- Crie uma área chamada Praça de Alimentação.
- Deve ficar no canto inferior direito.
- Cor amarelo/dourado.
- Deve ficar separada da Arena, mas conectada por corredores.
- Formato retangular comprido ou irregular.

13. Áreas de convivência
- Crie algumas áreas amarelas menores na parte inferior central.
- Devem parecer áreas abertas de apoio, alimentação ou convivência.
- Formatos irregulares, não retângulos perfeitos.

14. Objetos operacionais
- Adicione pelo menos dois bares.
- Um bar próximo à Praça de Alimentação.
- Um bar próximo aos camarotes.
- Adicione banheiros próximos à Praça de Alimentação.
- Adicione banheiros próximos aos camarotes laterais.
- Adicione saídas de emergência nas laterais esquerda e direita.
- Adicione entrada principal na parte inferior esquerda.
- Objetos operacionais devem ter metadata.role OPERATIONAL.

15. Estilo geral
- Use formas quebradas, inclinadas e irregulares sempre que possível.
- Não faça apenas retângulos perfeitos.
- Use POLYGON ou PATH com points para os setores principais.
- Mantenha nomes visíveis.
- Organize os setores como uma planta real de festival/rodeio.
- O mapa deve lembrar uma planta aérea do Jaguariúna Rodeo Festival, com palco em cima, público no centro, camarotes nas laterais e apoio na parte inferior.
'@

$body = @{
  mode = "generate"
  prompt = $prompt
  map = @{
    width = 1280
    height = 900
  }
  sectors = @(
    @{
      localId = "setor-pista-premium"
      name = "Pista Premium"
      color = "#f97316"
      kind = "GENERAL"
      capacity = "8000"
    },
    @{
      localId = "setor-arena"
      name = "Arena"
      color = "#d4af37"
      kind = "GENERAL"
      capacity = "30000"
    },
    @{
      localId = "setor-camarote-brahma"
      name = "Camarote Brahma"
      color = "#dc2626"
      kind = "BOOTH"
      capacity = "5000"
    },
    @{
      localId = "setor-rancho-brahma"
      name = "Rancho Brahma"
      color = "#7f1d1d"
      kind = "BOOTH"
      capacity = "1000"
    },
    @{
      localId = "setor-receptivo-brahma"
      name = "Receptivo Brahma"
      color = "#ef4444"
      kind = "BOOTH"
      capacity = "1500"
    },
    @{
      localId = "setor-corporativo"
      name = "Corporativo"
      color = "#6b7280"
      kind = "BOOTH"
      capacity = "1000"
    },
    @{
      localId = "setor-camarote-superbull"
      name = "Camarote Super Bull"
      color = "#0369a1"
      kind = "BOOTH"
      capacity = "4000"
    },
    @{
      localId = "setor-sb-open"
      name = "SB Open"
      color = "#9333ea"
      kind = "GENERAL"
      capacity = "2500"
    },
    @{
      localId = "setor-superbull"
      name = "Super Bull"
      color = "#075985"
      kind = "BOOTH"
      capacity = "2000"
    },
    @{
      localId = "setor-praca-alimentacao"
      name = "Praça de Alimentação"
      color = "#eab308"
      kind = "GENERAL"
      capacity = "3000"
    }
  )
  currentObjects = @()
} | ConvertTo-Json -Depth 40

$response = Invoke-RestMethod `
  -Uri "http://localhost:3001/v1/ai/event-map/generate" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body

$response | ConvertTo-Json -Depth 40