const prisma = require('../src/lib/prisma');

const PRODUCT_VARIANT_ID =
  'cmsjoc4zr0002n8varuh8mttu';


async function main() {

  console.log('');
  console.log('====================================');
  console.log('ROYAL LEGACY - PRUEBA DE INVENTARIO');
  console.log('====================================');
  console.log('');


  const variant =
    await prisma.productVariant.findUnique({
      where: {
        id: PRODUCT_VARIANT_ID
      },

      include: {
        product: true
      }
    });


  if (!variant) {

    console.log(
      '❌ No existe el ProductVariant'
    );

    console.log(
      PRODUCT_VARIANT_ID
    );

    return;
  }


  console.log(
    '✅ Variante encontrada'
  );

  console.log(
    'Producto:',
    variant.product?.name || 'Sin nombre'
  );

  console.log(
    'Variante:',
    variant.publicName
  );


  const existingAvailable =
    await prisma.inventoryItem.findFirst({
      where: {
        productVariantId:
          PRODUCT_VARIANT_ID,

        status:
          'AVAILABLE'
      }
    });


  if (existingAvailable) {

    console.log('');
    console.log(
      '✅ YA EXISTE INVENTARIO AVAILABLE'
    );

    console.log(
      'InventoryItem ID:',
      existingAvailable.id
    );

    return;
  }


  const item =
    await prisma.inventoryItem.create({
      data: {

        productVariantId:
          PRODUCT_VARIANT_ID,

        status:
          'AVAILABLE'
      }
    });


  console.log('');
  console.log(
    '✅ INVENTARIO CREADO CORRECTAMENTE'
  );

  console.log(
    'InventoryItem ID:',
    item.id
  );

  console.log(
    'productVariantId:',
    item.productVariantId
  );

  console.log(
    'status:',
    item.status
  );
}


main()
  .catch((error) => {

    console.error('');
    console.error(
      '❌ ERROR:',
      error.message || error
    );

    process.exitCode = 1;
  })
  .finally(async () => {

    await prisma.$disconnect();

  });