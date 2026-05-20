import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const TEST_EVENT_ID = "event-test-support-001";
const TEST_EVENT_NAME = "Evento Teste Suporte";
const SCREENSHOT_DIR = path.join(process.cwd(), "test-results", "support-flow-visual");

async function saveStepScreenshot(page: Page, name: string) {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

async function setVisualTestUser(page: Page) {
  await page.addInitScript(() => {
    const user = {
      id: "visual-test-user",
      name: "Produtor Teste Visual",
      email: "produtor.visual@local",
      role: "ADMIN",
      status: "ACTIVE",
    };

    sessionStorage.setItem("astro_session_token", "visual-test-token");
    sessionStorage.setItem("astro_session_user", JSON.stringify(user));
    sessionStorage.setItem("token", "visual-test-token");
    sessionStorage.setItem("user", JSON.stringify(user));
  });
}

async function openTestLabClean(page: Page) {
  await page.goto("/admin/support/test-lab");

  await page.evaluate(() => {
    localStorage.removeItem("astro_linked_support_tickets_v1");
  });

  await page.reload();

  await expect(page.getByRole("heading", { name: /Teste do suporte interligado/i })).toBeVisible();
  await expect(page.getByText(/Nenhum chamado selecionado/i)).toBeVisible();
}

async function clickStep(page: Page, stepName: RegExp, expectedText: RegExp, screenshotName: string) {
  await page.getByRole("button", { name: stepName }).click();
  await expect(page.getByText(expectedText).first()).toBeVisible();
  await saveStepScreenshot(page, screenshotName);
}

test.beforeEach(async ({ page }) => {
  await setVisualTestUser(page);
});

test("visual: laboratorio cria, encaminha, devolve e resolve o suporte interligado", async ({ page }) => {
  await openTestLabClean(page);
  await saveStepScreenshot(page, "01-lab-vazio");

  await clickStep(
    page,
    /1\. Criar chamado como produtor\/admin/i,
    /Chamado criado pelo produtor\/admin/i,
    "02-chamado-criado",
  );

  await expect(page.getByText(/Aberto/i).first()).toBeVisible();

  await clickStep(
    page,
    /2\. Encaminhar ao Super Admin/i,
    /encaminhado pelo produtor ao Super Admin/i,
    "03-encaminhado-super-admin",
  );

  await expect(page.getByText(/Com Super Admin/i).first()).toBeVisible();

  await clickStep(
    page,
    /3\. Super Admin devolve ao produtor/i,
    /devolveu o chamado ao produtor/i,
    "04-devolvido-produtor",
  );

  await expect(page.getByText(/Devolvido ao produtor/i).first()).toBeVisible();

  await clickStep(
    page,
    /4\. Operador encaminha ao Super Admin/i,
    /Operador encaminhou o mesmo chamado ao Super Admin/i,
    "05-operador-encaminhou-super-admin",
  );

  await expect(page.getByText(/Com Super Admin/i).first()).toBeVisible();

  await clickStep(
    page,
    /5\. Super Admin devolve ao operador/i,
    /devolveu o chamado ao operador/i,
    "06-devolvido-operador",
  );

  await expect(page.getByText(/Devolvido ao operador/i).first()).toBeVisible();

  await clickStep(
    page,
    /6\. Operador resolve chamado/i,
    /Operador resolveu o chamado/i,
    "07-resolvido-operador",
  );

  await expect(page.getByText(/Resolvido/i).first()).toBeVisible();

  await expect(page.getByText(/Chamado criado pelo laboratório de testes/i)).toBeVisible();
  await expect(page.getByText(/Encaminhamento de teste/i).first()).toBeVisible();
  await expect(page.getByText(/Resposta técnica de teste/i)).toBeVisible();
  await expect(page.getByText(/Operador finalizou o atendimento/i)).toBeVisible();

  await saveStepScreenshot(page, "08-historico-final-completo");
});

test("visual: paginas reais enxergam o mesmo chamado e o Super Admin devolve ao operador", async ({ page }) => {
  await openTestLabClean(page);

  await page.getByRole("button", { name: /1\. Criar chamado como produtor\/admin/i }).click();
  await expect(page.getByText(/Chamado criado pelo produtor\/admin/i)).toBeVisible();

  await page.getByRole("button", { name: /2\. Encaminhar ao Super Admin/i }).click();
  await expect(page.getByText(/Com Super Admin/i).first()).toBeVisible();
  await saveStepScreenshot(page, "09-real-lab-encaminhado");

  await page.goto("/admin/super/support");
  await expect(page.getByRole("heading", { name: /Suporte técnico interligado/i })).toBeVisible();
  await expect(page.getByText(/\[TESTE\] Fluxo interligado de suporte/i).first()).toBeVisible();
  await expect(page.getByText(/Com Super Admin/i).first()).toBeVisible();

  await page.getByPlaceholder(/Digite a orientação técnica/i).fill(
    "Teste visual real: Super Admin analisou e devolveu ao operador.",
  );

  await page.getByRole("button", { name: /Devolver ao operador/i }).click();

  // Depois que o Super Admin devolve para o operador, o chamado sai da fila tecnica do Super Admin.
  // Por isso a validacao correta acontece na tela do operador.
  await page.waitForTimeout(500);
  await saveStepScreenshot(page, "10-real-super-devolveu-operador");

  await page.goto(`/operator/support?eventId=${TEST_EVENT_ID}&eventName=${encodeURIComponent(TEST_EVENT_NAME)}`);
  await expect(page.getByRole("heading", { name: /Responder chamados ou acionar Super Admin/i })).toBeVisible();
  await expect(page.getByText(/Devolvido ao operador/i).first()).toBeVisible();

  await page.getByPlaceholder(/Descreva a solução/i).fill(
    "Teste visual real: operador finalizou depois da resposta do Super Admin.",
  );

  await page.getByRole("button", { name: /^Resolver$/i }).click();
  await expect(page.getByText(/Resolvido/i).first()).toBeVisible();
  await saveStepScreenshot(page, "11-real-operador-resolveu");
});