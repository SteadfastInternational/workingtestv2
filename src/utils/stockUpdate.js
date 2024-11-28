const Bull = require('bull');
const stockQueue = new Bull('stock-update-queue'); // The name of the queue

// Stock update job processor
stockQueue.process(async (job) => {
  const { OrderId, items } = job.data;

  try {
    // Loop through all the items in the Order
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Product not found for ID ${item.product}`);
      }

      const variation = product.variations.find(v => v._id.toString() === item.variation.toString());
      if (!variation) {
        throw new Error(`Variation not found for ID ${item.variation}`);
      }

      const newQuantity = variation.quantity - item.quantity;
      if (newQuantity < 0) {
        throw new Error(`Insufficient stock for variation ${item.variation}`);
      }

      variation.quantity = newQuantity;
      await variation.save();
    }

    console.log(`Stock updated successfully for Order ${OrderId}`);
  } catch (err) {
    console.error(`Error updating stock for Order ${OrderId}:`, err);
    throw err; // Re-throw for job retry handling
  }
});
