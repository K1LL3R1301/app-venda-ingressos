const API_URL = process.env.API_URL || "http://localhost:3001/v1";
const TOKEN = process.env.TOKEN || "";

const headers = {
  "Content-Type": "application/json",
};

if (TOKEN) {
  headers.Authorization = `Bearer ${TOKEN}`;
}

const images = {
  shows:
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
  theater:
    "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1200&q=80",
  comedy:
    "https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1200&q=80",
  sports:
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80",
  business:
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
  food:
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80",
  kids:
    "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1200&q=80",
  tours:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  online:
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
};

const collections = [
  {
    key: "shows",
    category: "Festas e Shows",
    city: "São Paulo",
    state: "SP",
    venueName: "Arena Black Dome",
    names: [
      "Festival Black Night 2026",
      "Baile Neon Experience",
      "Noite Eletrônica Premium",
      "Sunset Open Air",
    ],
    prices: ["90.00", "140.00", "220.00", "0.00"],
  },
  {
    key: "theater",
    category: "Teatro",
    city: "Rio de Janeiro",
    state: "RJ",
    venueName: "Teatro Central",
    names: [
      "A Comédia do Palco",
      "O Grande Espetáculo",
      "Musical Luzes da Cidade",
      "Peça Dramática Especial",
    ],
    prices: ["45.00", "80.00", "120.00", "0.00"],
  },
  {
    key: "comedy",
    category: "Comedy",
    city: "Belo Horizonte",
    state: "MG",
    venueName: "Clube do Riso",
    names: [
      "Stand Up Noite de Risadas",
      "Comedy Club Premium",
      "Humor Sem Freio",
      "Festival de Comédia",
    ],
    prices: ["35.00", "50.00", "75.00", "0.00"],
  },
  {
    key: "sports",
    category: "Esportes",
    city: "Curitiba",
    state: "PR",
    venueName: "Arena Esportiva Sul",
    names: [
      "Corrida Urbana 10K",
      "Campeonato Indoor",
      "Fight Night Experience",
      "Festival Esportivo Família",
    ],
    prices: ["30.00", "65.00", "110.00", "0.00"],
  },
  {
    key: "business",
    category: "Congressos",
    city: "São Paulo",
    state: "SP",
    venueName: "Centro de Convenções Tech",
    names: [
      "Tech Summit Brasil",
      "Congresso de Inovação",
      "Feira de Negócios Digitais",
      "Palestras Futuro do Mercado",
    ],
    prices: ["120.00", "250.00", "390.00", "0.00"],
  },
  {
    key: "food",
    category: "Gastronomia",
    city: "Salvador",
    state: "BA",
    venueName: "Espaço Gourmet",
    names: [
      "Festival Gastronômico",
      "Noite dos Food Trucks",
      "Degustação Premium",
      "Cerveja e Hambúrguer Fest",
    ],
    prices: ["40.00", "75.00", "130.00", "0.00"],
  },
  {
    key: "kids",
    category: "Infantil",
    city: "Campinas",
    state: "SP",
    venueName: "Parque Kids",
    names: [
      "Mundo Infantil Encantado",
      "Teatro para Crianças",
      "Festival da Família",
      "Oficina Kids Criativa",
    ],
    prices: ["25.00", "50.00", "90.00", "0.00"],
  },
  {
    key: "tours",
    category: "Passeios",
    city: "Florianópolis",
    state: "SC",
    venueName: "Ponto de Encontro Central",
    names: [
      "Tour Histórico pela Cidade",
      "Passeio Cultural Especial",
      "Experiência Natureza Viva",
      "Rota Fotográfica Urbana",
    ],
    prices: ["55.00", "85.00", "160.00", "0.00"],
  },
  {
    key: "online",
    category: "Online",
    city: "Online",
    state: "BR",
    venueName: "Evento Online",
    names: [
      "Workshop Online de Tecnologia",
      "Mentoria Digital ao Vivo",
      "Aula Online Premium",
      "Streaming Conference",
    ],
    prices: ["20.00", "60.00", "100.00", "0.00"],
  },
];

function addDays(days, hour = 20) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      `${options.method || "GET"} ${path} falhou: ${response.status} ${JSON.stringify(
        data,
      )}`,
    );
  }

  return data;
}

async function getOrCreateOrganizer() {
  const organizers = await request("/organizers");

  if (Array.isArray(organizers) && organizers.length > 0) {
    return organizers[0];
  }

  return request("/organizers", {
    method: "POST",
    body: JSON.stringify({
      tradeName: "Magic Plays",
      legalName: "Magic Plays Eventos LTDA",
      document: "00000000000100",
      email: "produtor@magicplays.test",
      phone: "11999999999",
    }),
  });
}

function buildEventPayload(organizerId, collection, name, index, price) {
  const dayOffset = index + 1;
  const eventDate = addDays(dayOffset, 19 + (index % 4));
  const isFree = Number(price) === 0;

  return {
    organizerId,
    name,
    description: `${name} criado para testar filtros de ${collection.category}.`,
    shortDescription: `Evento de teste para categoria ${collection.category}.`,
    category: collection.category,
    status: "PUBLISHED",
    visibility: "PUBLIC",
    timezone: "America/Sao_Paulo",
    eventDate,
    startDate: eventDate,
    endDate: addDays(dayOffset, 23),
    saleStartAt: addDays(-1, 9),
    saleEndAt: eventDate,
    capacity: 500 + index * 20,
    featured: index % 3 === 0,
    highlightTag: collection.category,
    checkoutTitle: `Ingressos para ${name}`,
    checkoutSubtitle: "Escolha seu ingresso e finalize a compra.",
    content: {
      headline: name,
      summary: `Experiência de ${collection.category} para testar vitrine, busca e filtros.`,
      fullDescription:
        "Evento criado automaticamente para validação de layout, categorias, busca, data, preço e ordenação.",
      attractions: "Atrações especiais, convidados e programação completa.",
      schedule: "Abertura dos portões às 18h. Início previsto às 20h.",
      importantInfo: "Chegue com antecedência e apresente o ingresso digital.",
    },
    location: {
      mode: collection.key === "online" ? "ONLINE" : "PRESENTIAL",
      venueName: collection.venueName,
      addressLine1: "Rua dos Eventos, 100",
      neighborhood: "Centro",
      city: collection.city,
      state: collection.state,
      zipCode: "01001000",
      instructions:
        collection.key === "online"
          ? "O link será enviado por email."
          : "Entrada principal pelo portão A.",
      latitude: "-23.55052",
      longitude: "-46.633308",
    },
    media: {
      coverImageUrl: images[collection.key],
      bannerImageUrl: images[collection.key],
      thumbnailUrl: images[collection.key],
      mobileBannerUrl: images[collection.key],
      gallery: [images[collection.key]],
    },
    policy: {
      ageRating: "Livre",
      refundPolicy: "Reembolso conforme política do evento.",
      transferPolicy: "Transferência permitida até 24h antes do evento.",
      entryRules: "Apresente documento e ingresso digital.",
    },
    ticketTypes: [
      {
        name: isFree ? "Entrada Gratuita" : "Ingresso Padrão",
        lotLabel: "Lote 1",
        description: isFree ? "Ingresso cortesia de teste." : "Ingresso de teste.",
        price,
        quantity: 200,
        minPerOrder: 1,
        maxPerOrder: 6,
        displayOrder: 0,
        status: "ACTIVE",
      },
      {
        name: "VIP",
        lotLabel: "Lote Especial",
        description: "Ingresso VIP de teste.",
        price: isFree ? "50.00" : (Number(price) + 80).toFixed(2),
        quantity: 80,
        minPerOrder: 1,
        maxPerOrder: 4,
        displayOrder: 1,
        status: "ACTIVE",
      },
    ],
  };
}

async function main() {
  console.log(`[seed] API: ${API_URL}`);

  const organizer = await getOrCreateOrganizer();

  if (!organizer?.id) {
    throw new Error("Organizer não encontrado/criado.");
  }

  console.log(`[seed] Organizer: ${organizer.tradeName || organizer.id}`);

  const currentEvents = await request("/events");
  const existingNames = new Set(
    Array.isArray(currentEvents)
      ? currentEvents.map((event) => String(event.name || "").toLowerCase())
      : [],
  );

  let created = 0;
  let skipped = 0;

  for (const collection of collections) {
    for (let index = 0; index < collection.names.length; index += 1) {
      const name = collection.names[index];
      const lowerName = name.toLowerCase();

      if (existingNames.has(lowerName)) {
        skipped += 1;
        console.log(`[seed] Já existe, pulando: ${name}`);
        continue;
      }

      const price = collection.prices[index % collection.prices.length];

      const payload = buildEventPayload(
        organizer.id,
        collection,
        name,
        created + index,
        price,
      );

      const event = await request("/events", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      existingNames.add(lowerName);
      created += 1;
      console.log(`[seed] Criado: ${event.name} | ${collection.category}`);
    }
  }

  console.log(`[seed] Finalizado. Criados: ${created}. Pulados: ${skipped}.`);
}

main().catch((error) => {
  console.error("[seed] Erro:", error.message);
  process.exit(1);
});