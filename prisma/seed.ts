import { PrismaClient, AttributeType } from '@prisma/client';

const prisma = new PrismaClient();

export async function main() {
  // --------------------------------------------------------------------------
  // Create Categories
  // --------------------------------------------------------------------------
  const electronics = await prisma.category.create({
    data: { key: 'electronics', name: 'Electronics' },
  });

  const phones = await prisma.category.create({
    data: { key: 'mobile_phones', name: 'Mobile Phones', parentId: electronics.id },
  });

  const laptops = await prisma.category.create({
    data: { key: 'laptops', name: 'Laptops', parentId: electronics.id },
  });

  const androidPhones = await prisma.category.create({
    data: { key: 'android_phones', name: 'Android Phones', parentId: phones.id },
  });

  const iphones = await prisma.category.create({
    data: { key: 'iphones', name: 'iPhones', parentId: phones.id },
  });

  const gamingLaptops = await prisma.category.create({
    data: { key: 'gaming_laptops', name: 'Gaming Laptops', parentId: laptops.id },
  });

  const businessLaptops = await prisma.category.create({
    data: { key: 'business_laptops', name: 'Business Laptops', parentId: laptops.id },
  });

  // --------------------------------------------------------------------------
  // CategoryTree (Closure Table)
  // --------------------------------------------------------------------------
  await prisma.categoryTree.createMany({
    data: [
      // Root
      { ancestorId: electronics.id, descendantId: electronics.id, depth: 0 },
      { ancestorId: electronics.id, descendantId: phones.id, depth: 1 },
      { ancestorId: electronics.id, descendantId: laptops.id, depth: 1 },
      { ancestorId: electronics.id, descendantId: androidPhones.id, depth: 2 },
      { ancestorId: electronics.id, descendantId: iphones.id, depth: 2 },
      { ancestorId: electronics.id, descendantId: gamingLaptops.id, depth: 2 },
      { ancestorId: electronics.id, descendantId: businessLaptops.id, depth: 2 },

      // Phones subtree
      { ancestorId: phones.id, descendantId: phones.id, depth: 0 },
      { ancestorId: phones.id, descendantId: androidPhones.id, depth: 1 },
      { ancestorId: phones.id, descendantId: iphones.id, depth: 1 },

      // Laptops subtree
      { ancestorId: laptops.id, descendantId: laptops.id, depth: 0 },
      { ancestorId: laptops.id, descendantId: gamingLaptops.id, depth: 1 },
      { ancestorId: laptops.id, descendantId: businessLaptops.id, depth: 1 },

      // Leaves
      { ancestorId: androidPhones.id, descendantId: androidPhones.id, depth: 0 },
      { ancestorId: iphones.id, descendantId: iphones.id, depth: 0 },
      { ancestorId: gamingLaptops.id, descendantId: gamingLaptops.id, depth: 0 },
      { ancestorId: businessLaptops.id, descendantId: businessLaptops.id, depth: 0 },
    ],
  });

  // --------------------------------------------------------------------------
  // Create Attributes
  // --------------------------------------------------------------------------
  await prisma.attribute.createMany({
    data: [
      // Global
      { key: 'brand', name: 'Brand', type: AttributeType.SHORTTEXT },

      // Root-level (inherited)
      { key: 'model', name: 'Model', type: AttributeType.SHORTTEXT },
      { key: 'warranty_period', name: 'Warranty Period', type: AttributeType.MULTISELECT },

      // Phone-specific
      { key: 'battery_capacity', name: 'Battery Capacity', type: AttributeType.SHORTTEXT },
      { key: 'camera_megapixels', name: 'Camera Megapixels', type: AttributeType.SHORTTEXT },
      { key: 'os_version', name: 'OS Version', type: AttributeType.SHORTTEXT },

      // Laptop-specific
      { key: 'ram_size', name: 'RAM Size', type: AttributeType.SHORTTEXT },
      { key: 'cpu_model', name: 'CPU Model', type: AttributeType.SHORTTEXT },
      { key: 'storage_type', name: 'Storage Type', type: AttributeType.SHORTTEXT },
      { key: 'gpu_model', name: 'GPU Model', type: AttributeType.SHORTTEXT },
    ]
  });


  // --------------------------------------------------------------------------
  // Create Attribute Options
  // --------------------------------------------------------------------------
  const warrantyPeriod = await prisma.attribute.findUnique({
    where: { key: 'warranty_period' },
  });

  if (warrantyPeriod) {
    await prisma.attributeOption.createMany({
      data: [
        { value: '6 months', attributeId: warrantyPeriod.id },
        { value: '12 months', attributeId: warrantyPeriod.id },
        { value: '24 months', attributeId: warrantyPeriod.id },
      ],
    });
  }

  const attributes = await prisma.attribute.findMany();
  const attrMap = Object.fromEntries(attributes.map((a) => [a.key, a]));

  // --------------------------------------------------------------------------
  // Create Category–Attribute Links
  // --------------------------------------------------------------------------
  await prisma.categoryAttribute.createMany({
    data: [
      // Root
      { categoryId: electronics.id, attributeId: attrMap['model'].id },
      { categoryId: electronics.id, attributeId: attrMap['warranty_period'].id },

      // Phones
      { categoryId: phones.id, attributeId: attrMap['battery_capacity'].id },
      { categoryId: phones.id, attributeId: attrMap['camera_megapixels'].id },
      { categoryId: phones.id, attributeId: attrMap['os_version'].id },

      // Laptops
      { categoryId: laptops.id, attributeId: attrMap['ram_size'].id },
      { categoryId: laptops.id, attributeId: attrMap['cpu_model'].id },
      { categoryId: laptops.id, attributeId: attrMap['storage_type'].id },

      // Gaming laptops (specialized)
      { categoryId: gamingLaptops.id, attributeId: attrMap['gpu_model'].id },
    ],
  });

  // --------------------------------------------------------------------------
  // Create Products
  // --------------------------------------------------------------------------
  const galaxy = await prisma.product.create({
    data: {
      name: 'Samsung Galaxy S24 Ultra',
      sku: 'GALAXY-S24U',
      categoryId: androidPhones.id,
    },
  });

  const iphone = await prisma.product.create({
    data: {
      name: 'iPhone 15 Pro',
      sku: 'IPH15PRO',
      categoryId: iphones.id,
    },
  });

  const asusLaptop = await prisma.product.create({
    data: {
      name: 'ASUS ROG Strix G16',
      sku: 'ROG-G16',
      categoryId: gamingLaptops.id,
    },
  });

  const dellLaptop = await prisma.product.create({
    data: {
      name: 'Dell Latitude 7440',
      sku: 'LAT7440',
      categoryId: businessLaptops.id,
    },
  });

  // --------------------------------------------------------------------------
  // Create Product Attribute Values
  // --------------------------------------------------------------------------
  const warrantyOptions = await prisma.attributeOption.findMany({
    where: { attributeId: attrMap['warranty_period'].id },
  });

  const optionMap = {
    warranty: Object.fromEntries(warrantyOptions.map((o) => [o.value, o.id])),
  };

  await prisma.productAttributeValue.createMany({
    data: [
      // Galaxy
      { productId: galaxy.id, attributeId: attrMap['brand'].id, value: 'Samsung' },
      { productId: galaxy.id, attributeId: attrMap['model'].id, value: 'Galaxy S24 Ultra' },
      { productId: galaxy.id, attributeId: attrMap['battery_capacity'].id, value: '5000mAh' },
      { productId: galaxy.id, attributeId: attrMap['camera_megapixels'].id, value: '200MP' },
      { productId: galaxy.id, attributeId: attrMap['os_version'].id, value: 'Android 14' },
      { productId: galaxy.id, attributeId: attrMap['warranty_period'].id, attributeOptionId: optionMap.warranty['12 months'] },

      // iPhone
      { productId: iphone.id, attributeId: attrMap['brand'].id, value: 'Apple' },
      { productId: iphone.id, attributeId: attrMap['model'].id, value: 'iPhone 15 Pro' },
      { productId: iphone.id, attributeId: attrMap['battery_capacity'].id, value: '3274mAh' },
      { productId: iphone.id, attributeId: attrMap['camera_megapixels'].id, value: '48MP' },
      { productId: iphone.id, attributeId: attrMap['os_version'].id, value: 'iOS 18' },

      // ASUS ROG
      { productId: asusLaptop.id, attributeId: attrMap['brand'].id, value: 'ASUS' },
      { productId: asusLaptop.id, attributeId: attrMap['model'].id, value: 'ROG Strix G16' },
      { productId: asusLaptop.id, attributeId: attrMap['ram_size'].id, value: '32GB' },
      { productId: asusLaptop.id, attributeId: attrMap['cpu_model'].id, value: 'Intel Core i9-14900HX' },
      { productId: asusLaptop.id, attributeId: attrMap['storage_type'].id, value: '1TB SSD' },
      { productId: asusLaptop.id, attributeId: attrMap['gpu_model'].id, value: 'NVIDIA RTX 4070' },

      // Dell Latitude
      { productId: dellLaptop.id, attributeId: attrMap['brand'].id, value: 'Dell' },
      { productId: dellLaptop.id, attributeId: attrMap['model'].id, value: 'Latitude 7440' },
      { productId: dellLaptop.id, attributeId: attrMap['ram_size'].id, value: '16GB' },
      { productId: dellLaptop.id, attributeId: attrMap['cpu_model'].id, value: 'Intel Core i7-1365U' },
      { productId: dellLaptop.id, attributeId: attrMap['storage_type'].id, value: '512GB SSD' },
    ],
  });

  console.log('Seed completed successfully');
}


main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    setTimeout(() => process.exit(1), 500);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
