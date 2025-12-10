import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../models/product_model.dart';
import '../../providers/product_provider.dart';
import '../../services/firebase_service.dart';
import 'package:firebase_storage/firebase_storage.dart';

class AddProductScreen extends StatefulWidget {
  final ProductModel? product;

  const AddProductScreen({super.key, this.product});

  @override
  State<AddProductScreen> createState() => _AddProductScreenState();
}

class _AddProductScreenState extends State<AddProductScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _buyingPriceController = TextEditingController();
  final _sellingPriceController = TextEditingController();
  final _wholesalePriceController = TextEditingController();
  final _stockController = TextEditingController();
  final _barcodeController = TextEditingController();

  File? _imageFile;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    if (widget.product != null) {
      _nameController.text = widget.product!.name;
      _buyingPriceController.text = widget.product!.buyingPrice.toString();
      _sellingPriceController.text = widget.product!.sellingPrice.toString();
      _wholesalePriceController.text = widget.product!.wholesalePrice?.toString() ?? '';
      _stockController.text = widget.product!.stockQuantity.toString();
      _barcodeController.text = widget.product!.barcode ?? '';
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _buyingPriceController.dispose();
    _sellingPriceController.dispose();
    _wholesalePriceController.dispose();
    _stockController.dispose();
    _barcodeController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.camera);

    if (pickedFile != null) {
      setState(() => _imageFile = File(pickedFile.path));
    }
  }

  Future<String?> _uploadImage() async {
    if (_imageFile == null) return null;

    try {
      final fileName = 'products/${DateTime.now().millisecondsSinceEpoch}.jpg';
      final ref = FirebaseService.storage.ref(fileName);
      await ref.putFile(_imageFile!);
      return await ref.getDownloadURL();
    } catch (e) {
      debugPrint('Error uploading image: $e');
      return null;
    }
  }

  Future<void> _saveProduct() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final imageUrl = await _uploadImage();

      final product = ProductModel(
        id: widget.product?.id ?? '',
        name: _nameController.text.trim(),
        buyingPrice: double.parse(_buyingPriceController.text),
        sellingPrice: double.parse(_sellingPriceController.text),
        wholesalePrice: _wholesalePriceController.text.isNotEmpty
            ? double.parse(_wholesalePriceController.text)
            : null,
        stockQuantity: int.parse(_stockController.text),
        barcode: _barcodeController.text.isNotEmpty ? _barcodeController.text.trim() : null,
        imageUrl: imageUrl ?? widget.product?.imageUrl,
        createdAt: widget.product?.createdAt ?? DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final productProvider = Provider.of<ProductProvider>(context, listen: false);
      final success = widget.product != null
          ? await productProvider.updateProduct(widget.product!.id, product)
          : await productProvider.addProduct(product);

      if (success && mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.product != null ? 'Product updated' : 'Product added'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.product != null ? 'Edit Product' : 'Add Product'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              GestureDetector(
                onTap: _pickImage,
                child: Container(
                  height: 200,
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey[300]!),
                  ),
                  child: _imageFile != null
                      ? Image.file(_imageFile!, fit: BoxFit.cover)
                      : widget.product?.imageUrl != null
                          ? Image.network(widget.product!.imageUrl!, fit: BoxFit.cover)
                          : Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.camera_alt, size: 48, color: Colors.grey[600]),
                                const SizedBox(height: 8),
                                Text('Tap to take photo', style: TextStyle(color: Colors.grey[600])),
                              ],
                            ),
                ),
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Product Name *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) => value?.isEmpty ?? true ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _buyingPriceController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Buying Price',
                        border: OutlineInputBorder(),
                        prefixText: '\$',
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _sellingPriceController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Selling Price *',
                        border: OutlineInputBorder(),
                        prefixText: '\$',
                      ),
                      validator: (value) => value?.isEmpty ?? true ? 'Required' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _wholesalePriceController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Wholesale Price (Optional)',
                  border: OutlineInputBorder(),
                  prefixText: '\$',
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _stockController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Stock Quantity *',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) => value?.isEmpty ?? true ? 'Required' : null,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _barcodeController,
                      decoration: const InputDecoration(
                        labelText: 'Barcode (Optional)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isLoading ? null : _saveProduct,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(widget.product != null ? 'Update Product' : 'Add Product'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

