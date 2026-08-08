const prisma = require('../src/lib/prisma');

async function main() {
  console.log('Preparando prueba automática de códigos...');

  // 1. Buscar el correo que ya funciona
  const alias = await prisma.emailAlias.findUnique({
    where: {
      fullAddress: 'cliente001@royxxlex.com'
    }
  });

  if (!alias) {
    throw new Error(
      'No existe cliente001@royxxlex.com en EmailAlias'
    );
  }

  // 2. Crear categoría si no existe
  const category = await prisma.category.upsert({
    where: {
      slug: 'streaming-prueba'
    },
    update: {},
    create: {
      name: 'Streaming Prueba',
      slug: 'streaming-prueba',
      description: 'Categoría para prueba de códigos',
      active: true
    }
  });

  // 3. Crear producto si no existe
  const product = await prisma.product.upsert({
    where: {
      slug: 'producto-prueba-codigos'
    },
    update: {},
    create: {
      categoryId: category.id,
      name: 'Producto Prueba Códigos',
      slug: 'producto-prueba-codigos',
      description: 'Producto temporal para validar códigos',
      active: true
    }
  });

  // 4. Crear variante
  let variant = await prisma.productVariant.findFirst({
    where: {
      productId: product.id,
      publicName: 'Perfil 30 días - Prueba'
    }
  });

  if (!variant) {
    variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        accessType: 'PROFILE',
        durationDays: 30,
        publicName: 'Perfil 30 días - Prueba',
        publicPrice: 100,
        active: true
      }
    });
  }

  // 5. Crear inventario
  let inventoryItem = await prisma.inventoryItem.findFirst({
    where: {
      productVariantId: variant.id,
      notes: 'PRUEBA_AUTOMATICA_CODIGOS'
    }
  });

  if (!inventoryItem) {
    inventoryItem = await prisma.inventoryItem.create({
      data: {
        productVariantId: variant.id,
        status: 'AVAILABLE',
        notes: 'PRUEBA_AUTOMATICA_CODIGOS'
      }
    });
  }

  // 6. Vincular cliente001 al inventario
  let inventoryAlias = await prisma.inventoryAlias.findFirst({
    where: {
      inventoryItemId: inventoryItem.id,
      emailAliasId: alias.id
    }
  });

  if (!inventoryAlias) {
    inventoryAlias = await prisma.inventoryAlias.create({
      data: {
        inventoryItemId: inventoryItem.id,
        emailAliasId: alias.id,
        active: true
      }
    });
  } else if (!inventoryAlias.active) {
    inventoryAlias = await prisma.inventoryAlias.update({
      where: {
        id: inventoryAlias.id
      },
      data: {
        active: true,
        releasedAt: null
      }
    });
  }

  // 7. Marcar el alias como asignado
  await prisma.emailAlias.update({
    where: {
      id: alias.id
    },
    data: {
      status: 'ASSIGNED',
      assignedAt: new Date()
    }
  });

  // 8. Crear solicitud PENDING
  let codeRequest = await prisma.codeRequest.findFirst({
    where: {
      inventoryItemId: inventoryItem.id,
      status: 'PENDING'
    }
  });

  if (!codeRequest) {
    codeRequest = await prisma.codeRequest.create({
      data: {
        inventoryItemId: inventoryItem.id,
        status: 'PENDING',
        notes: 'Prueba automática de recepción'
      }
    });
  }

  console.log('');
  console.log('===================================');
  console.log('LISTO');
  console.log('===================================');
  console.log('Correo:', alias.fullAddress);
  console.log('InventoryItem ID:', inventoryItem.id);
  console.log('CodeRequest ID:', codeRequest.id);
  console.log('Estado:', codeRequest.status);
  console.log('===================================');
  console.log('');
  console.log(
    'Ahora manda un correo a cliente001@royxxlex.com con: Tu código es 123456'
  );
}

main()
  .catch(error => {
    console.error('ERROR:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });