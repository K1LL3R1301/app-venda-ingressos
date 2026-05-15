# Relatorio de Testes v101b

**Data:** 15/05/2026 08:33:16

## Resumo

- PASS: 31
- FAIL: 2
- WARN: 2
- SKIP: 3

## Resultados

### [PASS] Raiz package.json

Encontrado: package.json

### [PASS] API package.json

Encontrado: apps\api\package.json

### [PASS] WEB package.json

Encontrado: apps\web\package.json

### [PASS] Prisma schema

Encontrado: apps\api\prisma\schema.prisma

### [PASS] CustomerHeader

Encontrado: apps\web\src\components\customer\CustomerHeader.tsx

### [PASS] OperatorPanel

Encontrado: apps\web\src\app\operator\_components\OperatorPanel.tsx

### [PASS] Rota apps\web\src\app\admin\super\page.tsx

Encontrado: apps\web\src\app\admin\super\page.tsx

### [PASS] Rota apps\web\src\app\admin\super\organizers\page.tsx

Encontrado: apps\web\src\app\admin\super\organizers\page.tsx

### [PASS] Rota apps\web\src\app\admin\super\events\page.tsx

Encontrado: apps\web\src\app\admin\super\events\page.tsx

### [PASS] Rota apps\web\src\app\admin\super\orders\page.tsx

Encontrado: apps\web\src\app\admin\super\orders\page.tsx

### [PASS] Rota apps\web\src\app\admin\super\finance\page.tsx

Encontrado: apps\web\src\app\admin\super\finance\page.tsx

### [PASS] Rota apps\web\src\app\admin\super\operators\page.tsx

Encontrado: apps\web\src\app\admin\super\operators\page.tsx

### [PASS] Rota apps\web\src\app\admin\super\fees\page.tsx

Encontrado: apps\web\src\app\admin\super\fees\page.tsx

### [PASS] Rota apps\web\src\app\operator\dashboard\page.tsx

Encontrado: apps\web\src\app\operator\dashboard\page.tsx

### [PASS] Rota apps\web\src\app\operator\events\page.tsx

Encontrado: apps\web\src\app\operator\events\page.tsx

### [PASS] Rota apps\web\src\app\operator\validation\page.tsx

Encontrado: apps\web\src\app\operator\validation\page.tsx

### [PASS] Rota apps\web\src\app\operator\support\page.tsx

Encontrado: apps\web\src\app\operator\support\page.tsx

### [PASS] Rota apps\web\src\app\operator\reports\page.tsx

Encontrado: apps\web\src\app\operator\reports\page.tsx

### [PASS] Rota apps\web\src\app\(customer)\events\cities\page.tsx

Encontrado: apps\web\src\app\(customer)\events\cities\page.tsx

### [PASS] OperatorPanel tem somente um Topbar

Encontrado 1 ocorrencia(s).

### [PASS] OperatorPanel tem HeroMetric

Encontrado 1 ocorrencia(s).

### [PASS] OperatorPanel sem header antigo simples

Nenhum padrao quebrado encontrado em apps\web\src\app\operator\_components\OperatorPanel.tsx

### [PASS] CustomerHeader sem onChange duplicado obvio

Nenhum padrao quebrado encontrado em apps\web\src\components\customer\CustomerHeader.tsx

### [PASS] Prisma validate

Concluido com sucesso.

Log: `C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\test-reports\v101b-20260515-083236\Prisma-validate.log`

### [WARN] Prisma generate

Falhou com codigo 1, mas marcado como opcional. Veja log.

Log: `C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\test-reports\v101b-20260515-083236\Prisma-generate.log`

### [WARN] Prisma generate aviso

Se o log mostrar EPERM/query_engine-windows.dll.node, pare API/WEB e rode npx prisma generate manualmente.

### [PASS] API build

Concluido com sucesso.

Log: `C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\test-reports\v101b-20260515-083236\API-build.log`

### [PASS] WEB build

Concluido com sucesso.

Log: `C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\test-reports\v101b-20260515-083236\WEB-build.log`

### [SKIP] API unit tests

Use -Unit para rodar Jest.

### [SKIP] WEB lint

Use -Lint para rodar npm run lint no WEB.

### [SKIP] API lint

API lint usa --fix; rode manualmente se quiser.

### [FAIL] API Swagger docs

http://localhost:3001/docs nao respondeu corretamente: Impossível conectar-se ao servidor remoto

### [FAIL] API base v1

http://localhost:3001/v1 nao respondeu corretamente: Impossível conectar-se ao servidor remoto

### [PASS] WEB dashboard

http://localhost:3000/dashboard respondeu HTTP 200

### [PASS] WEB admin dashboard

http://localhost:3000/admin/dashboard respondeu HTTP 200

### [PASS] WEB super admin

http://localhost:3000/admin/super respondeu HTTP 200

### [PASS] WEB operator dashboard

http://localhost:3000/operator/dashboard respondeu HTTP 200

### [PASS] WEB event cities

http://localhost:3000/events/cities respondeu HTTP 200

## Como interpretar

- FAIL precisa ser corrigido.
- WARN pode ser aceitavel, mas precisa conferir o log.
- SKIP significa que voce nao ativou aquela bateria de testes.

## Comandos recomendados

```powershell
powershell -ExecutionPolicy Bypass -File ".\aplicar-v101b-testes-completos-corrigido.ps1" -Build -Smoke
powershell -ExecutionPolicy Bypass -File ".\aplicar-v101b-testes-completos-corrigido.ps1" -Build -Unit -Lint -Smoke
```
