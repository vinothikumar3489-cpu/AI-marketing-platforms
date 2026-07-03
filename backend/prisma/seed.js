import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Check if default user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: 'orkyn@gmail.com' }
  });

  if (existingUser) {
    console.log('✅ Default user already exists');
    return;
  }

  // Create default user
  const hashedPassword = bcrypt.hashSync('12345678', 10);
  
  const user = await prisma.user.create({
    data: {
      name: 'Orkyn',
      email: 'orkyn@gmail.com',
      password: hashedPassword
    }
  });

  console.log('✅ Default user created:');
  console.log('   Email: orkyn@gmail.com');
  console.log('   Password: 12345678');
  console.log('   User ID:', user.id);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
