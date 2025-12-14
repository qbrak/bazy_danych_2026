"""
Example unit tests for the backend.
These are placeholder tests to demonstrate the testing setup.
"""

import pytest


def test_addition():
    """Example test: simple addition."""
    assert 1 + 1 == 2


def test_string_operations():
    """Example test: string operations."""
    greeting = "Hello, World!"
    assert greeting.lower() == "hello, world!"
    assert greeting.startswith("Hello")
    assert len(greeting) == 13


def test_list_operations():
    """Example test: list operations."""
    items = [1, 2, 3, 4, 5]
    assert len(items) == 5
    assert sum(items) == 15
    assert 3 in items


class TestInventoryExample:
    """Example test class for inventory-related logic."""

    def test_empty_inventory(self):
        """Test empty inventory."""
        inventory = []
        assert len(inventory) == 0

    def test_add_item_to_inventory(self):
        """Test adding an item to inventory."""
        inventory = []
        item = {"name": "Widget", "quantity": 10, "price": 9.99}
        inventory.append(item)
        assert len(inventory) == 1
        assert inventory[0]["name"] == "Widget"

    def test_calculate_total_value(self):
        """Test calculating total inventory value."""
        inventory = [
            {"name": "Widget", "quantity": 10, "price": 9.99},
            {"name": "Gadget", "quantity": 5, "price": 19.99},
        ]
        total = sum(item["quantity"] * item["price"] for item in inventory)
        assert total == pytest.approx(199.85, rel=1e-2)
