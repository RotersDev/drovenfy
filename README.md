# Drovenfy

Crie cardápios digitais profissionais para lanchonetes e hamburguerias em minutos.

## Estrutura do Projeto

```
drovenfy/
├── backend/                  # Servidor Express (API)
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts         # Entry point do servidor
│       ├── database/
│       │   └── db.ts         # Leitura/escrita do banco (JSON)
│       └── routes/
│           ├── index.ts      # Agregador de rotas
│           ├── auth.routes.ts
│           └── menu.routes.ts
│
├── frontend/                 # Aplicação React + Vite
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── App.tsx           # Router principal
│       ├── main.tsx          # Entry point do React
│       ├── index.css         # Tailwind CSS
│       ├── types/            # Interfaces TypeScript
│       ├── lib/              # Utilitários (cn, formatCurrency)
│       ├── services/         # Camada de comunicação com API
│       ├── components/       # Componentes reutilizáveis
│       └── pages/            # Páginas da aplicação
│
├── package.json              # Dependências e scripts
├── tsconfig.json             # Config base TypeScript
└── .env.example              # Variáveis de ambiente
```

## Rodar Localmente

**Pré-requisitos:** Node.js >= 20

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure o `.env.local` com sua chave Gemini API (se necessário):
   ```
   GEMINI_API_KEY="sua-chave-aqui"
   ```

3. Rode o projeto:
   ```bash
   npm run dev
   ```

4. Acesse: [http://localhost:3000](http://localhost:3000)

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento (backend + frontend) |
| `npm run build` | Build de produção do frontend |
| `npm run preview` | Preview do build de produção |
| `npm run lint` | Verifica tipos TypeScript (frontend + backend) |
