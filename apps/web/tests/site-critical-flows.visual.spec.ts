import { expect, test } from "@playwright/test";
import {
  collectPageProblems,
  saveVisualScreenshot,
  seedSession,
  seedSupportTicket,
} from "./_helpers/visual-auth";

async function openFast(page: import("@playwright/test").Page, path: string) {
  page.setDefaultTimeout(5_000);
  page.setDefaultNavigationTimeout(12_000);

  await page.goto(path, {
    waitUntil: "domcontentloaded",
    timeout: 12_000,
  });

  await page.waitForTimeout(700);
}

test.describe("visual: fluxos criticos fora do suporte", () => {
  test.setTimeout(25_000);

  test("admin wallet abre e mostra resumo financeiro sem crash", async ({ page }) => {
    const problems = await collectPageProblems(page);

    await seedSession(page, "ADMIN");
    await seedSupportTicket(page);

    await openFast(page, "/admin/wallet");

    const bodyText = await page.locator("body").innerText({ timeout: 5_000 });

    await saveVisualScreenshot(page, "flow-admin-wallet-resumo");

    expect.soft(bodyText).not.toMatch(
      /This page couldn't load|Application error|Unhandled Runtime Error|Objects are not valid as a React child|Hydration failed/i,
    );

    expect.soft(bodyText).toMatch(/Wallet|Receitas dos eventos|Valor real produtor|Vendas pagas/i);
    expect.soft(problems, "admin-wallet console/page errors").toEqual([]);
  });

  test("login aparece limpo sem sessão", async ({ page }) => {
    const problems = await collectPageProblems(page);

    await page.addInitScript(() => {
      sessionStorage.clear();
      localStorage.removeItem("astro_session_token");
      localStorage.removeItem("astro_session_user");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    });

    await openFast(page, "/login");

    const body = await page.locator("body").innerText({ timeout: 5_000 });

    await saveVisualScreenshot(page, "flow-login-limpo");

    expect.soft(body).toMatch(/login|entrar|cpf|senha|astro/i);
    expect.soft(body).not.toMatch(/Application error|Unhandled Runtime Error|Hydration failed/i);
    expect.soft(problems, "login console/page errors").toEqual([]);
  });

  test("menu principal do admin nao quebra", async ({ page }) => {
    const problems = await collectPageProblems(page);

    await seedSession(page, "ADMIN");
    await openFast(page, "/admin/wallet");

    const bodyBefore = await page.locator("body").innerText({ timeout: 5_000 });

    const possibleMenuButtons = page
      .locator("button")
      .filter({ hasText: /menu|☰|A|abrir/i });

    const count = await possibleMenuButtons.count().catch(() => 0);

    if (count > 0) {
      await possibleMenuButtons.first().click({ timeout: 3_000 }).catch(() => undefined);
      await page.waitForTimeout(300);
    }

    const bodyAfter = await page.locator("body").innerText({ timeout: 5_000 });

    await saveVisualScreenshot(page, "flow-menu-principal-admin");

    expect.soft(bodyBefore + "\n" + bodyAfter).toMatch(/Wallet|Admin|Painel|Eventos|Operadores|Suporte|Astro/i);
    expect.soft(bodyAfter).not.toMatch(/Application error|Unhandled Runtime Error|Hydration failed/i);
    expect.soft(problems, "menu console/page errors").toEqual([]);
  });
});