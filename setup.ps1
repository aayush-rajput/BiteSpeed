Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "prisma" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "package.json", "package-lock.json", ".env", ".gitignore", "prisma.config.ts" -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path "C:\Users\KIIT0001\Desktop\Tech\bitespeed"
Set-Location -Path "C:\Users\KIIT0001\Desktop\Tech\bitespeed"
npm init -y
npm i express prisma "@prisma/client" typescript ts-node nodemon
npm i -D "@types/express" "@types/node"
npx tsc --init
npx prisma init --datasource-provider sqlite
