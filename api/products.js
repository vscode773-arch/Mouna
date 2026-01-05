import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // --- GET: Search Products ---
        if (req.method === 'GET') {
            const { barcode, page = 1, limit = 50, search = '' } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const where = {};

            if (barcode) {
                where.barcode = barcode;
            } else if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { barcode: { contains: search, mode: 'insensitive' } }
                ];
            }

            // 1. Check Inventory
            const total = await prisma.product.count({ where });
            let products = await prisma.product.findMany({
                where,
                skip: barcode ? 0 : skip, // No skip if specific barcode
                take: barcode ? undefined : parseInt(limit),
                include: { addedBy: { select: { name: true } } },
                orderBy: { createdAt: 'desc' }
            });

            // 2. 🧠 MEMORY CHECK (The Fix)
            // If searching by barcode AND not found in inventory
            if (barcode && products.length === 0) {
                // Check memory table
                const savedDetails = await prisma.savedProduct.findUnique({
                    where: { barcode }
                });

                if (savedDetails) {
                    console.log("Product found in Memory:", savedDetails.name);
                    // Return as a virtual product
                    products = [{
                        id: null, // Null ID = Not in stock
                        barcode: savedDetails.barcode,
                        name: savedDetails.name,
                        category: savedDetails.category,
                        image: savedDetails.image,
                        expiry: null,
                        quantity: 0,
                        department: null,
                        fromMemory: true
                    }];
                }
            }

            return res.status(200).json({
                data: products,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            });
        }

        // --- POST: Add Product ---
        if (req.method === 'POST') {
            const { name, category, expiry, department, image, addedByUserId, barcode, quantity = 1 } = req.body;

            // 1. 🧠 MEMORY SAVE (The Fix)
            // Always update memory when adding/saving a product
            if (barcode && name) {
                await prisma.savedProduct.upsert({
                    where: { barcode },
                    update: {
                        name,
                        category,
                        image: image || undefined,
                        updatedAt: new Date()
                    },
                    create: {
                        barcode,
                        name,
                        category,
                        image,
                        updatedAt: new Date()
                    }
                }).catch(err => console.error("Memory Save Error:", err));
            }

            // Normal Inventory Logic
            const expiryDate = new Date(expiry);
            expiryDate.setHours(0, 0, 0, 0);

            // Duplicate Check logic simplified for Vercel efficiency
            // We just check barcodes
            let existingProduct = null;
            if (barcode) {
                const candidates = await prisma.product.findMany({ where: { barcode } });
                existingProduct = candidates.find(p => {
                    const pDate = new Date(p.expiry);
                    pDate.setHours(0, 0, 0, 0);
                    return pDate.getTime() === expiryDate.getTime();
                });
            }

            if (existingProduct) {
                // MERGE
                const updated = await prisma.product.update({
                    where: { id: existingProduct.id },
                    data: {
                        quantity: { increment: parseInt(quantity) },
                        name, // Update name in case it changed
                        category,
                        image: image || existingProduct.image
                    }
                });
                return res.status(200).json(updated);
            }

            // CREATE
            const product = await prisma.product.create({
                data: {
                    name,
                    category,
                    expiry: new Date(expiry),
                    department,
                    quantity: parseInt(quantity),
                    image,
                    addedByUserId,
                    barcode
                }
            });

            // Log Audit (fire and forget to speed up response)
            prisma.auditLog.create({
                data: {
                    action: 'CREATE',
                    target: product.name,
                    details: `Added new product (Qty: ${quantity})`,
                    userId: addedByUserId
                }
            }).catch(console.error);

            return res.status(200).json(product);
        }

        res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
