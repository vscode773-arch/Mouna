import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: 'admin',
            name: 'المدير العام',
            role: 'admin',
        },
    });

    const supervisor = await prisma.user.upsert({
        where: { username: 'navid' },
        update: {},
        create: {
            username: 'navid',
            password: '123',
            name: 'مساعد مدير',
            role: 'supervisor',
        },
    });

    // Seed Products
    const productsCount = await prisma.product.count();
    if (productsCount === 0) {
        console.log('Seeding products...');
        await prisma.product.createMany({
            data: [
                {
                    name: 'حليب المراعي كامل الدسم 1L',
                    category: 'الألبان',
                    expiry: new Date('2026-01-10'),
                    department: 'الثلاجة 1',
                    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=300',
                    addedByUserId: admin.id
                },
                {
                    name: 'زيت عافية ذرة 1.5 لتر',
                    category: 'الزيوت',
                    expiry: new Date('2026-12-01'),
                    department: 'ممر 3',
                    image: 'https://images.unsplash.com/photo-1474979266404-7caddbed77a8?auto=format&fit=crop&q=80&w=300',
                    addedByUserId: supervisor.id
                },
                {
                    name: 'أرز بسمتي الشعلة 5 كيلو',
                    category: 'الحبوب',
                    expiry: new Date('2027-04-20'),
                    department: 'مستودع 2',
                    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=300',
                    addedByUserId: admin.id
                },
                {
                    name: 'عصير برتقال نادك',
                    category: 'المشروبات',
                    expiry: new Date('2026-01-05'),
                    department: 'الثلاجة 2',
                    image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&q=80&w=300',
                    addedByUserId: admin.id
                },
                {
                    name: 'جبنة كرافت شيدر',
                    category: 'الأجبان',
                    expiry: new Date('2026-03-15'),
                    department: 'الثلاجة 1',
                    image: 'https://images.unsplash.com/photo-1618160580227-1830e03e7c8f?auto=format&fit=crop&q=80&w=300',
                    addedByUserId: supervisor.id
                }
            ]
        });
    }

    console.log({ admin, supervisor });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
