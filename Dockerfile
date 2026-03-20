FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

6. Scroll down → click **"Commit changes"**

---

### Step 2 — Also fix the `package.json`

The build script `prisma generate && tsc` might also be causing issues. Let's simplify it.

1. Click on **`package.json`** in GitHub
2. Click the **pencil icon ✏️** to edit
3. Find this line:
```
"build": "prisma generate && tsc",
```
4. Change it to:
```
"build": "tsc",
