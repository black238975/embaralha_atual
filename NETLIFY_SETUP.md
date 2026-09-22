# Deploy na Netlify

Este projeto foi ajustado para o TanStack Start na Netlify.

- Build command: `npm run build`
- Publish directory: `dist/client`
- O `netlify.toml` já contém essas configurações.
- O plugin oficial `@netlify/vite-plugin-tanstack-start` foi adicionado ao Vite.
- As variáveis públicas do Supabase existentes em `.env` continuam disponíveis no build.

Depois de enviar os arquivos ao GitHub, faça um novo deploy na Netlify. Se o projeto já existia, use **Clear cache and deploy site** para evitar reutilizar o build antigo.
