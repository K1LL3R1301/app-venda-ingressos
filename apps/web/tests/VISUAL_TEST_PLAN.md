# Plano de testes visuais do site

## O que já ficou coberto

### Rotas principais
- Login
- Dashboard do cliente
- Pedidos/ingressos do cliente
- Wallet do cliente
- Suporte do cliente
- Dashboard admin
- Eventos admin
- Criar evento admin
- Pedidos admin
- Operadores admin
- Wallet admin
- Suporte admin
- Laboratório de suporte
- Suporte técnico Super Admin
- Dashboard operador
- Wallet operador
- Suporte operador
- Check-in operador

### Fluxos críticos
- Suporte interligado completo:
  - cria chamado
  - encaminha para Super Admin
  - devolve para produtor
  - encaminha pelo operador
  - devolve para operador
  - operador resolve
- Wallet admin:
  - valida Valor real produtor
  - valida Vendas pagas
  - valida Equipe no fechamento
- Login sem sessão
- Menu principal do admin

## Como usar

Rodar tudo com navegador visível:

```powershell
cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos"
powershell -ExecutionPolicy Bypass -File .\run-site-visual-tests.ps1
```

Rodar auditoria visual sem travar no primeiro problema:

```powershell
cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos"
powershell -ExecutionPolicy Bypass -File .\run-site-visual-audit.ps1
```

## Onde ver os prints

```txt
apps\web\test-results\site-wide-visual
apps\web\test-results\support-flow-visual
```

## O que adicionar depois

- Compra de ingresso completa
- Criação real de evento preenchendo formulário
- Pedido pago/manual
- Check-in com QR real
- Transferência/carteira customer
- Solicitação Pix operator
- Encerramento financeiro do evento
- Permissões reais por evento no operador