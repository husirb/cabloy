module.exports = app => {
  const schemas = {};
  // product
  schemas.product = {
    type: 'object',
    properties: {
      atomName: {
        type: 'string',
        ebType: 'text',
        ebTitle: 'Product Name',
        notEmpty: true,
      },
      productCode: {
        type: 'string',
        ebType: 'text',
        ebTitle: 'Product Code',
        notEmpty: true,
        'x-productCode': true,
      },
      productPrice: {
        type: 'number',
        ebType: 'text',
        ebTitle: 'Product Price',
        ebCurrency: true,
        // notEmpty: true,
      },
    },
  };
  // product
  schemas.productSearch = {
    type: 'object',
    properties: {
      productCode: {
        type: 'string',
        ebType: 'text',
        ebTitle: 'Product Code',
      },
    },
  };
  return schemas;
};
