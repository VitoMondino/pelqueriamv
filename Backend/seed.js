require('dotenv').config()
const bcrypt = require('bcryptjs')
const db     = require('./src/config/db')

async function seed() {
  const email    = 'admin@peluqueria.com'
  const password = 'mvsalonurbano57+'
  const nombre   = 'Administrador'

  const hash = await bcrypt.hash(password, 12)

  await db.query(
    `INSERT INTO usuarios (email, password, nombre, rol)
     VALUES ($1, $2, $3, 'Administrador')
     ON CONFLICT (email) DO UPDATE SET password = $2`,
    [email, hash, nombre]
  )

  console.log('✅ Usuario creado exitosamente')
  console.log('   Email:    ', email)
  console.log('   Password: ', password)
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})