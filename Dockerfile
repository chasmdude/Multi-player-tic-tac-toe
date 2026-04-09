# Use official Nakama image as base
FROM heroiclabs/nakama:3.21.1

# Copy your compiled game logic to the modules directory
COPY backend/build/main.js /nakama/data/modules/main.js

# Create a startup script that runs migrations and then starts Nakama
RUN echo '#!/bin/bash\n\
/nakama/nakama migrate up --database.address "${NK_DATABASE_ADDRESS}" && \
exec /nakama/nakama --config /nakama/data/local.yml --database.address "${NK_DATABASE_ADDRESS}" --logger.level INFO\n' > /start.sh && \
chmod +x /start.sh

CMD ["/start.sh"]