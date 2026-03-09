# 🏠 MisCuartos — Gestión de Inquilinos

App web para que tu papá gestione los pagos de sus inquilinos fácilmente.

## ✨ Funcionalidades

- 👥 **Ver todos los inquilinos** — con resumen de cuántos hay, cuántos están al día y cuántos adeudan
- ✅ **Filtrar los que están al día** — pagaron dentro de los últimos 30 días
- ⚠️ **Filtrar los que adeudan** — su último pago fue hace más de 30 días
- ➕ **Agregar nuevos inquilinos** — registra cuarto, nombre, monto y fecha de pago
- ✏️ **Registrar pagos** — actualiza la fecha de pago de un inquilino
- 🚪 **Dar de baja** — elimina inquilinos que dejan la habitación
- 💾 **Guarda automáticamente** en el navegador (localStorage)

---

## 🚀 Cómo subir a GitHub y Vercel

### Paso 1 — Subir a GitHub

1. Ve a [github.com](https://github.com) y crea una cuenta (si no tienes)
2. Haz clic en **"New repository"** (botón verde)
3. Ponle nombre: `mis-cuartos`, selecciona **Public**, haz clic en **Create**
4. En tu computadora, abre la terminal en la carpeta del proyecto y ejecuta:

```bash
git init
git add .
git commit -m "primer commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/mis-cuartos.git
git push -u origin main
```

> Reemplaza `TU_USUARIO` con tu usuario de GitHub

---

### Paso 2 — Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com) y crea una cuenta (puedes iniciar sesión con GitHub)
2. Haz clic en **"Add New Project"**
3. Selecciona el repositorio `mis-cuartos`
4. Vercel detecta automáticamente que es un proyecto Vite/React
5. Haz clic en **"Deploy"** — ¡listo!

En menos de 2 minutos tendrás una URL pública como:
```
https://mis-cuartos.vercel.app
```

---

### Paso 3 — Actualizaciones futuras

Cada vez que hagas cambios y los subas a GitHub:
```bash
git add .
git commit -m "descripción del cambio"
git push
```
Vercel re-desplegará automáticamente 🎉

---

## 🖥️ Correr en local (para desarrollo)

```bash
npm install
npm run dev
```

Abre: http://localhost:5173

---

## 📦 Tecnologías

- [React 18](https://react.dev)
- [Vite 5](https://vitejs.dev)
- Fuentes: Sora + DM Mono (Google Fonts)
- Sin base de datos — los datos se guardan en el navegador con `localStorage`
