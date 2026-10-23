from datetime import date
from typing import Literal, Annotated
from pydantic import BaseModel, ConfigDict, Field, field_validator, StringConstraints

PasswordText = Annotated[str, StringConstraints(strip_whitespace=False)]

class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)

class Login(Input):
    email: str = Field(min_length=3, max_length=255)
    password: PasswordText = Field(min_length=1, max_length=1024)
    @field_validator('email')
    @classmethod
    def email_valid(cls, value):
        if '@' not in value or any(c.isspace() for c in value):
            raise ValueError('Email không hợp lệ')
        return value.lower()

class Register(Login):
    name: str = Field(min_length=1, max_length=150)
    password: PasswordText = Field(min_length=6, max_length=1024)

class Profile(Input):
    name: str = Field(min_length=1, max_length=150)
    email: str = Field(min_length=3, max_length=255)
    _email = field_validator('email')(Login.email_valid.__func__)

class PasswordChange(Input):
    current_password: PasswordText = Field(min_length=1, max_length=1024)
    password: PasswordText = Field(min_length=8, max_length=1024)

class Forgot(Input):
    email: str = Field(min_length=3, max_length=255)

class Reset(Input):
    token: str = Field(min_length=20, max_length=200)
    password: PasswordText = Field(min_length=8, max_length=1024)

class Category(Input):
    name: str = Field(min_length=1, max_length=150)
    description: str = Field(default='', max_length=500)

class Dish(Input):
    name: str = Field(min_length=1, max_length=200)
    category_id: str = Field(min_length=1, max_length=50)
    description: str = ''
    time: int = Field(ge=1, le=1440)
    difficulty: Literal['Dễ', 'Trung bình', 'Khó'] = 'Dễ'
    image: str = Field(default='images/logo.jpg', max_length=500)
    home_display: bool = True
    foods_display: bool = True

class Ingredient(Input):
    name: str = Field(min_length=1, max_length=150)
    quantity: float = Field(gt=0, le=1000000, allow_inf_nan=False)
    unit_id: str = Field(min_length=1, max_length=50)
    group: str | None = Field(default=None, max_length=50)

class PantryQuantity(Input):
    quantity: float = Field(ge=0, le=1000000, allow_inf_nan=False)

class Recipe(Input):
    dish_id: str = Field(min_length=1, max_length=50)
    description: str = ''
    servings: int = Field(ge=1, le=1000)
    ingredients: list[Ingredient] = Field(default_factory=list, max_length=200)
    steps: list[str] = Field(default_factory=list, max_length=200)

class Video(Input):
    recipe_id: str = Field(min_length=1, max_length=50)
    title: str = Field(min_length=1, max_length=200)
    path: str = Field(min_length=1, max_length=500)
    description: str = Field(default='', max_length=500)

class Review(Input):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=1, max_length=1000)

class ReviewModeration(Input):
    status: Literal['Đã duyệt', 'Từ chối']
    note: str = Field(default='', max_length=500)

class MenuItem(Input):
    dish_id: str = Field(min_length=1, max_length=50)
    date: date
    meal: Literal['Sáng', 'Trưa', 'Tối', 'Ăn nhẹ']
    servings: int = Field(default=1, ge=1, le=1000)

class UserUpdate(Profile):
    role: Literal['Người dùng', 'Quản trị hệ thống', 'Quản trị nội dung']
    status: Literal['Đang hoạt động', 'Tạm khóa']
    password: PasswordText | None = Field(default=None, min_length=8, max_length=1024)


class Preferences(Input):
    ingredients: list[Literal['chicken', 'pork', 'seafood', 'beef', 'vegetables', 'eggs_tofu']] = Field(min_length=1, max_length=6)
    occasions: list[Literal['solo', 'family', 'healthy', 'low_carb', 'children', 'friends']] = Field(min_length=1, max_length=6)
    tastes: list[Literal['savory', 'spicy', 'sweet_sour', 'light', 'rich']] = Field(min_length=1, max_length=5)
    time: Literal['quick', 'medium', 'relaxed']
    tools: list[Literal['stove', 'air_fryer', 'pressure_cooker', 'oven', 'no_cook']] = Field(min_length=1, max_length=5)
    regions: list[str] = Field(default_factory=list, max_length=5)
    avoid: list[Literal['none', 'seafood_allergy', 'peanut', 'lactose', 'spicy_avoid']] = Field(default_factory=list, max_length=5)
    budget: Literal['', 'saving', 'normal', 'comfortable'] = ''
    skill: str = ''
    meals: list[str] = Field(default_factory=list, max_length=4)

    @field_validator('ingredients', 'occasions', 'tastes', 'tools')
    @classmethod
    def unique_tags(cls, value):
        return list(dict.fromkeys(value))
