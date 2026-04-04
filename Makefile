PYTHON=python3
PIP=$(PYTHON) -m pip

install:
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt

dev:
	FLASK_APP=run.py FLASK_ENV=development $(PYTHON) run.py

run:
	$(PYTHON) run.py

test:
	$(PYTHON) -m pytest -q

lint:
	@echo "Add a linter such as ruff or flake8 when ready."

format:
	@echo "Add a formatter such as black when ready."

clean:
	find . -type d -name "__pycache__" -prune -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
