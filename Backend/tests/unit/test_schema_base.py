"""Tests for shared schema behavior."""

from src.base.schema import CamelCaseModel


class ExampleSchema(CamelCaseModel):
    """Example schema for alias testing."""

    adult_price: int
    child_price: int


def test_camel_case_model__snake_case_fields__serializes_camel_case_aliases() -> None:
    """CamelCaseModel should serialize public JSON aliases for FE."""
    schema = ExampleSchema(adult_price=100, child_price=50)

    assert schema.model_dump(by_alias=True) == {"adultPrice": 100, "childPrice": 50}


def test_camel_case_model__camel_case_input__populates_python_fields() -> None:
    """CamelCaseModel should accept FE camelCase input."""
    schema = ExampleSchema(adultPrice=100, childPrice=50)

    assert schema.adult_price == 100
    assert schema.child_price == 50
