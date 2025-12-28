// Echeq - Panel de Administración JavaScript

let currentCredentials = {};

// ===== FUNCIONALIDAD DE NAVEGACIÓN DE TABS =====

// Función para alternar secciones colapsables
function toggleCollapsibleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const toggle = document.getElementById(sectionId.replace('-section', '-toggle'));
    
    if (section && toggle) {
        if (section.style.display === 'none' || section.style.display === '') {
            section.style.display = 'block';
            toggle.textContent = '▲';
        } else {
            section.style.display = 'none';
            toggle.textContent = '▼';
        }
    }
}

// Funciones de tabs
function showTab(tabName) {
    console.log('showTab called with:', tabName);
    try {
        // Ocultar todos los tabs del menú lateral
        document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Mostrar el tab seleccionado - buscar por el onclick en el menú lateral
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            if (item.onclick && item.onclick.toString().includes(tabName)) {
                item.classList.add('active');
            }
        });

        const targetElement = document.getElementById(tabName);
        if (targetElement) {
            targetElement.classList.add('active');
            console.log('Tab activated:', tabName);
        } else {
            console.error('Element not found:', tabName);
        }

        // Si es la pestaña de documentación, inicializar Swagger
        if (tabName === 'docs') {
            initializeSwagger();
        }

        // Si es la pestaña de API Testing, detectar credenciales copiadas y mostrar secciones
        if (tabName === 'api-testing') {
            console.log('Ejecutando lógica para api-testing');
            detectarCredencialesCopiadas();
            
            // Mostrar las secciones step-content en api-testing
            const apiTestingSection = document.getElementById('api-testing');
            console.log('Sección api-testing encontrada:', !!apiTestingSection);
            if (apiTestingSection) {
                const stepContents = apiTestingSection.querySelectorAll('.step-content');
                console.log('Secciones step-content encontradas:', stepContents.length);
                stepContents.forEach((content, index) => {
                    content.style.display = 'block';
                    console.log(`Sección ${index + 1} mostrada`);
                });
            }
        }

        // Si es la pestaña de logs, cargar logs
        if (tabName === 'logs') {
            refreshLogs();
        }

        // Si es la pestaña de testing, cargar credenciales automáticamente
        if (tabName === 'testing') {
            loadCredentialsFromStorage();
        }

        // Si es la pestaña de credenciales, inicializar el sistema de pasos progresivos
        if (tabName === 'credentials') {
            initializeProgressiveSteps();
        }
    } catch (error) {
        console.error('Error in showTab:', error);
    }
}

// Versión con debouncing de showTab para evitar ejecuciones múltiples
const debouncedShowTab = debounce(showTab, 100);

// ===== FUNCIONALIDAD DE ADMINISTRACIÓN DE TENANTS =====

// Cargar lista de tenants con clave de administrador
async function loadTenants() {
    const adminKeyInput = document.getElementById('adminKeyInput');
    const tenantsTable = document.getElementById('tenantsTable');
    const noTenantsMessage = document.getElementById('noTenantsMessage');
    const tenantsTableBody = document.querySelector('#tenantsTable tbody');
    
    const adminKey = adminKeyInput.value;
    if (!adminKey) {
        showAlert('Por favor, ingresa la clave de administrador.', 'warning');
        return;
    }

    try {
        showAlert('Cargando tenants...', 'info');
        const response = await fetch(`/api/real/tenants?password=${adminKey}`);
        const data = await response.json();

        if (data.success && data.data) {
            renderTenants(data.data);
            showAlert(`Se cargaron ${data.data.length} tenants exitosamente.`, 'success');
        } else {
            showAlert(data.message || 'Error al cargar tenants.', 'error');
            renderTenants([]); // Limpiar tabla en caso de error
        }
    } catch (error) {
        console.error('Error fetching tenants:', error);
        showAlert('Error de conexión al servidor.', 'error');
        renderTenants([]); // Limpiar tabla en caso de error
    }
}

// Renderizar lista de tenants en la tabla
function renderTenants(tenants) {
    const tenantsTable = document.getElementById('tenantsTable');
    const noTenantsMessage = document.getElementById('noTenantsMessage');
    const bulkActionsContainer = document.getElementById('bulkActionsContainer');
    const tenantsTableBody = document.querySelector('#tenantsTable tbody');
    
    // Limpiar filas existentes
    tenantsTableBody.innerHTML = '';
    
    if (tenants && tenants.length > 0) {
        tenants.forEach((tenant, index) => {
            const row = tenantsTableBody.insertRow();
            row.dataset.tenantId = tenant.id;
            
            // Checkbox para selección múltiple
            const checkboxCell = row.insertCell();
            checkboxCell.style.textAlign = 'center';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'tenant-checkbox';
            checkbox.value = tenant.id;
            checkbox.onchange = updateBulkActions;
            checkbox.style.transform = 'scale(1.2)';
            checkboxCell.appendChild(checkbox);
            
            // Datos del tenant
            row.insertCell().textContent = tenant.id || 'N/A';
            row.insertCell().textContent = tenant.name || 'N/A';
            row.insertCell().textContent = tenant.code || 'N/A';
            row.insertCell().textContent = tenant.email || 'N/A';
            row.insertCell().textContent = tenant.is_active ? 'Activo' : 'Inactivo';
            
            // Celda de acciones
            const actionsCell = row.insertCell();
            actionsCell.style.whiteSpace = 'nowrap'; // Evitar que los botones se envuelvan
            actionsCell.style.display = 'flex'; // Usar flexbox para los botones
            actionsCell.style.gap = '5px'; // Pequeña separación entre botones
            
            // Botón Ver Detalles
            const viewButton = document.createElement('button');
            viewButton.innerHTML = '👁️';
            viewButton.style.background = 'none';
            viewButton.style.border = 'none';
            viewButton.style.padding = '0';
            viewButton.style.cursor = 'pointer';
            viewButton.style.fontSize = '1.2em'; // Icono un poco más grande
            viewButton.title = 'Ver Detalles'; // Tooltip
            viewButton.onclick = () => showTenantDetails(tenant);
            actionsCell.appendChild(viewButton);
            
            // Botón Eliminar
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '🗑️';
            deleteButton.style.background = 'none';
            deleteButton.style.border = 'none';
            deleteButton.style.padding = '0';
            deleteButton.style.cursor = 'pointer';
            deleteButton.style.fontSize = '1.2em'; // Icono un poco más grande
            deleteButton.title = 'Eliminar'; // Tooltip
            deleteButton.onclick = () => deleteTenant(tenant.id);
            actionsCell.appendChild(deleteButton);
        });
        
        tenantsTable.style.display = 'table';
        bulkActionsContainer.style.display = 'block';
        noTenantsMessage.style.display = 'none';
        
        // Resetear selección después de un delay para asegurar que los elementos estén en el DOM
        setTimeout(() => {
            updateBulkActions();
        }, 100);
    } else {
        tenantsTable.style.display = 'none';
        bulkActionsContainer.style.display = 'none';
        noTenantsMessage.style.display = 'block';
    }
}

// Mostrar detalles del tenant en modal
async function showTenantDetails(tenant) {
    const modal = document.getElementById('tenantDetailsModal');
    const modalTenantName = document.getElementById('modalTenantName');
    const modalTenantId = document.getElementById('modalTenantId');
    const modalTenantEmail = document.getElementById('modalTenantEmail');
    const modalTenantCode = document.getElementById('modalTenantCode');
    const modalTenantApiKey = document.getElementById('modalTenantApiKey');
    const modalTenantApiSecret = document.getElementById('modalTenantApiSecret');
    
    // Llenar información básica
    modalTenantName.textContent = tenant.name || 'N/A';
    modalTenantId.textContent = tenant.id || 'N/A';
    modalTenantEmail.textContent = tenant.email || 'N/A';
    modalTenantCode.textContent = tenant.code || 'N/A';
    
    // Obtener credenciales del tenant
    const adminKey = document.getElementById('adminKeyInput').value;
    if (adminKey) {
        try {
            const response = await fetch(`/api/real/tenants/${tenant.id}/credentials?password=${adminKey}`);
            const data = await response.json();
            
            if (data.success && data.data) {
                modalTenantApiKey.textContent = data.data.apiKey || 'No disponible';
                modalTenantApiSecret.textContent = data.data.apiSecret || 'No disponible';
            } else {
                modalTenantApiKey.textContent = 'Error al cargar credenciales';
                modalTenantApiSecret.textContent = 'Error al cargar credenciales';
            }
        } catch (error) {
            console.error('Error fetching tenant credentials:', error);
            modalTenantApiKey.textContent = 'Error de conexión';
            modalTenantApiSecret.textContent = 'Error de conexión';
        }
    } else {
        modalTenantApiKey.textContent = 'Clave de administrador requerida';
        modalTenantApiSecret.textContent = 'Clave de administrador requerida';
    }
    
    // Mostrar modal
    modal.style.display = 'block';
    
    // Configurar evento de cierre
    const closeButton = modal.querySelector('.close-button');
    closeButton.onclick = () => {
        modal.style.display = 'none';
    };
    
    // Cerrar al hacer clic fuera del modal
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Eliminar tenant
async function deleteTenant(tenantId) {
    const adminKey = document.getElementById('adminKeyInput').value;
    if (!adminKey) {
        showAlert('Por favor, ingresa la clave de administrador para eliminar.', 'warning');
        return;
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar el tenant con ID: ${tenantId}?\n\nEsta acción no se puede deshacer.`)) {
        return;
    }

    try {
        showAlert('Eliminando tenant...', 'info');
        const response = await fetch(`/api/real/tenants/${tenantId}?password=${adminKey}`, {
            method: 'DELETE',
        });
        const data = await response.json();

        if (data.success) {
            showAlert(`Tenant ${tenantId} eliminado exitosamente.`, 'success');
            loadTenants(); // Recargar la lista
        } else {
            showAlert(data.message || `Error al eliminar tenant ${tenantId}.`, 'error');
        }
    } catch (error) {
        console.error('Error deleting tenant:', error);
        showAlert('Error de conexión al servidor al intentar eliminar.', 'error');
    }
}

// ===== FUNCIONALIDADES DE SELECCIÓN MÚLTIPLE =====

// Actualizar controles de selección múltiple
function updateBulkActions() {
    const checkboxes = document.querySelectorAll('.tenant-checkbox');
    const selectedCount = document.querySelectorAll('.tenant-checkbox:checked').length;
    const totalCount = checkboxes.length;
    
    const selectedCountSpan = document.getElementById('selectedCount');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    const selectAllCheckbox = document.getElementById('selectAllTenants');
    const selectAllHeader = document.getElementById('selectAllHeader');
    
    // Verificar que los elementos existan antes de usarlos
    if (!selectedCountSpan || !bulkDeleteBtn || !selectAllCheckbox || !selectAllHeader) {
        console.warn('Algunos elementos de la interfaz no están disponibles aún');
        return;
    }
    
    // Actualizar contador
    selectedCountSpan.textContent = `${selectedCount} seleccionados`;
    
    // Habilitar/deshabilitar botones
    const hasSelection = selectedCount > 0;
    if (bulkDeleteBtn) {
        bulkDeleteBtn.disabled = !hasSelection;
    }
    
    // Actualizar checkbox "Seleccionar Todos"
    if (selectedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        selectAllHeader.checked = false;
        selectAllHeader.indeterminate = false;
    } else if (selectedCount === totalCount) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
        selectAllHeader.checked = true;
        selectAllHeader.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
        selectAllHeader.checked = false;
        selectAllHeader.indeterminate = true;
    }
}

// Alternar selección de todos los tenants
function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('.tenant-checkbox');
    const selectAllCheckbox = document.getElementById('selectAllTenants');
    const selectAllHeader = document.getElementById('selectAllHeader');
    
    // Si está marcado, desmarcar todos; si está desmarcado, marcar todos
    const shouldSelectAll = selectAllCheckbox.checked || selectAllHeader.checked;
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = shouldSelectAll;
    });
    
    updateBulkActions();
}

// Eliminar tenants seleccionados
async function bulkDeleteTenants() {
    const selectedCheckboxes = document.querySelectorAll('.tenant-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
    
    if (selectedIds.length === 0) {
        showAlert('No hay tenants seleccionados para eliminar.', 'warning');
        return;
    }
    
    const adminKey = document.getElementById('adminKeyInput').value;
    if (!adminKey) {
        showAlert('Por favor, ingresa la clave de administrador para eliminar.', 'warning');
        return;
    }
    
    if (!confirm(`¿Estás seguro de que quieres eliminar ${selectedIds.length} tenant(s) seleccionado(s)?\n\nEsta acción no se puede deshacer.`)) {
        return;
    }
    
    try {
        showAlert(`Eliminando ${selectedIds.length} tenant(s)...`, 'info');
        
        // Eliminar tenants uno por uno
        let successCount = 0;
        let errorCount = 0;
        
        for (const tenantId of selectedIds) {
            try {
                const response = await fetch(`/api/real/tenants/${tenantId}?password=${adminKey}`, {
                    method: 'DELETE',
                });
                const data = await response.json();
                
                if (data.success) {
                    successCount++;
                } else {
                    errorCount++;
                    console.error(`Error eliminando tenant ${tenantId}:`, data.message);
                }
            } catch (error) {
                errorCount++;
                console.error(`Error eliminando tenant ${tenantId}:`, error);
            }
        }
        
        if (successCount > 0) {
            showAlert(`${successCount} tenant(s) eliminado(s) exitosamente.${errorCount > 0 ? ` ${errorCount} error(es).` : ''}`, 'success');
            loadTenants(); // Recargar la lista
        } else {
            showAlert('No se pudo eliminar ningún tenant.', 'error');
        }
    } catch (error) {
        console.error('Error en eliminación masiva:', error);
        showAlert('Error de conexión al servidor.', 'error');
    }
}


// Sistema de pasos progresivos
let currentStep = 1;
let stepStates = {
    1: 'pending',
    2: 'pending', 
    3: 'pending'
};

// Inicializar el sistema de pasos
function initializeProgressiveSteps() {
    // Mostrar solo el primer paso inicialmente
    showStep(1);
    updateStepStatus(1, 'current');
}

// Mostrar un paso específico
function showStep(stepNumber) {
    // Ocultar todos los pasos excepto la sección de consulta de tenants existentes (que está colapsada)
    document.querySelectorAll('.step-content').forEach(content => {
        // No ocultar la sección de consulta de tenants existentes (ya está colapsada por defecto)
        if (!content.closest('.step-card').querySelector('h3')?.textContent?.includes('Consultar Tenants Existentes')) {
            content.style.display = 'none';
        }
    });
    
    // Mostrar el paso seleccionado
    const stepContent = document.getElementById(`step${stepNumber}-content`);
    if (stepContent) {
        stepContent.style.display = 'block';
    }
}

// Actualizar el estado de un paso
function updateStepStatus(stepNumber, status) {
    const statusElement = document.getElementById(`step${stepNumber}-status`);
    if (statusElement) {
        statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        statusElement.className = `step-status ${status}`;
    }
}

// Completar un paso
function completeStep(stepNumber) {
    stepStates[stepNumber] = 'completed';
    updateStepStatus(stepNumber, 'completed');
    
    // Mostrar el siguiente paso si existe
    if (stepNumber < 3) {
        showStep(stepNumber + 1);
        updateStepStatus(stepNumber + 1, 'current');
    }
}

// Saltar al paso 1 (función modificada)
function skipStep1() {
    completeStep(1);
    showStep(2);
    updateStepStatus(2, 'current');
}

// Funciones de tabs
function showTab(tabName) {
    console.log('showTab called with:', tabName);
    
    try {
        // Ocultar todos los tabs del menú lateral
        document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Mostrar el tab seleccionado - buscar por el onclick en el menú lateral
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            if (item.onclick && item.onclick.toString().includes(tabName)) {
                item.classList.add('active');
            }
        });
        
        const targetElement = document.getElementById(tabName);
        if (targetElement) {
            targetElement.classList.add('active');
            console.log('Tab activated:', tabName);
        } else {
            console.error('Element not found:', tabName);
        }
        
        // Si es la pestaña de documentación, inicializar Swagger
        if (tabName === 'docs') {
            initializeSwagger();
        }
        
        // Si es la pestaña de API Testing, detectar credenciales copiadas y mostrar secciones
        if (tabName === 'api-testing') {
            console.log('Ejecutando lógica para api-testing');
            detectarCredencialesCopiadas();
            
            // Mostrar las secciones step-content en api-testing
            const apiTestingSection = document.getElementById('api-testing');
            console.log('Sección api-testing encontrada:', !!apiTestingSection);
            if (apiTestingSection) {
                const stepContents = apiTestingSection.querySelectorAll('.step-content');
                console.log('Secciones step-content encontradas:', stepContents.length);
                stepContents.forEach((content, index) => {
                    content.style.display = 'block';
                    console.log(`Sección ${index + 1} mostrada`);
                });
            }
        }
        
        // Si es la pestaña de logs, cargar logs
        if (tabName === 'logs') {
            refreshLogs();
        }
        
        // Si es la pestaña de testing, cargar credenciales automáticamente
        if (tabName === 'testing') {
            loadCredentialsFromStorage();
        }
        
        // Si es la pestaña de testing, no se necesita configuración adicional
        
        // Si es la pestaña de credenciales, inicializar el sistema de pasos progresivos
        if (tabName === 'credentials') {
            initializeProgressiveSteps();
        }
    } catch (error) {
        console.error('Error in showTab:', error);
    }
}

// Función para actualizar el indicador de credenciales en el header
function updateCredentialsIndicator() {
    const indicator = document.getElementById('credentials-indicator');
    if (!indicator) return;
    
    const storedCredentials = localStorage.getItem('echeq_sandbox_credentials');
    
    if (storedCredentials) {
        try {
            const credentials = JSON.parse(storedCredentials);
            const generatedAt = new Date(credentials.generatedAt);
            const timeAgo = getTimeAgo(generatedAt);
            
            indicator.querySelector('.credentials-text').textContent = `Credenciales Guardadas (${timeAgo})`;
            indicator.style.display = 'flex';
            
            // Agregar tooltip con detalles
            indicator.title = `API Key: ${credentials.apiKey}\nGenerado: ${generatedAt.toLocaleString()}`;
            
            // Hacer clickeable para ir a API Testing & Documentation
            indicator.onclick = () => showTab('api-testing');
        } catch (error) {
            console.error('Error parsing stored credentials:', error);
            indicator.style.display = 'none';
        }
    } else {
        indicator.style.display = 'none';
    }
}

// Función para calcular tiempo transcurrido
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'ahora';
    if (diffMins < 60) return `${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
}

// Función para limpiar credenciales
function clearCredentials() {
    if (confirm('¿Estás seguro de que quieres limpiar las credenciales guardadas?')) {
        localStorage.removeItem('echeq_sandbox_credentials');
        currentCredentials = null;
        updateCredentialsIndicator();
        
        // Limpiar campos en Testing APIs si está visible
        const apiKeyField = document.getElementById('testApiKey');
        const apiSecretField = document.getElementById('testApiSecret');
        const tenantIdField = document.getElementById('testTenantId');
        const swaggerAccessSection = document.getElementById('swaggerAccess');
        const credentialsForm = document.getElementById('testCredentialsForm');
        
        if (apiKeyField && apiSecretField && tenantIdField) {
            apiKeyField.value = '';
            apiSecretField.value = '';
            tenantIdField.value = '';
        }
        
        // Ocultar sección de credenciales configuradas
        if (swaggerAccessSection) {
            swaggerAccessSection.style.display = 'none';
        }
        
        // Mostrar sección de entrada de credenciales
        if (credentialsForm && credentialsForm.parentElement) {
            credentialsForm.parentElement.style.display = 'block';
        }
        
        showAlert('Credenciales limpiadas correctamente.', 'info');
    }
}

// Función para cargar credenciales desde localStorage
function loadCredentialsFromStorage() {
    try {
        const storedCredentials = localStorage.getItem('echeq_sandbox_credentials');
        
        if (storedCredentials) {
            const credentials = JSON.parse(storedCredentials);
            
            // Llenar los campos del formulario
            document.getElementById('testApiKey').value = credentials.apiKey;
            document.getElementById('testApiSecret').value = credentials.apiSecret;
            document.getElementById('testTenantId').value = credentials.tenantId;
            
            // Configurar automáticamente las credenciales
            currentCredentials = {
                apiKey: credentials.apiKey,
                apiSecret: credentials.apiSecret,
                tenantId: credentials.tenantId
            };
            
            // Mostrar la sección de acceso configurado
            document.getElementById('swaggerAccess').style.display = 'block';
            
            // Reinicializar Swagger UI con las credenciales cargadas
            initializeSwagger();
            
            showAlert('Credenciales cargadas automáticamente desde la sesión anterior.', 'info');
        } else {
            // Limpiar campos si no hay credenciales guardadas
            document.getElementById('testApiKey').value = '';
            document.getElementById('testApiSecret').value = '';
            document.getElementById('testTenantId').value = '';
            document.getElementById('swaggerAccess').style.display = 'none';
        }
    } catch (error) {
        console.error('Error cargando credenciales desde localStorage:', error);
        showAlert('Error cargando credenciales guardadas.', 'error');
    }
}

// Función para configurar credenciales
function configureCredentials() {
    const apiKey = document.getElementById('testApiKey').value;
    const apiSecret = document.getElementById('testApiSecret').value;
    const tenantId = document.getElementById('testTenantId').value;
    
    if (!apiKey || !apiSecret || !tenantId) {
        showAlert('Por favor, completa todos los campos antes de continuar.', 'error');
        return;
    }
    
    // Guardar credenciales
    currentCredentials = {
        apiKey: apiKey,
        apiSecret: apiSecret,
        tenantId: tenantId
    };
    
    // Mostrar sección de acceso configurado
    document.getElementById('swaggerAccess').style.display = 'block';
    
    // Reinicializar Swagger UI con las nuevas credenciales
    initializeSwagger();
    
    // Guardar también en localStorage para persistencia
    const credentials = {
        apiKey: apiKey,
        apiSecret: apiSecret,
        tenantId: tenantId,
        generatedAt: new Date().toISOString()
    };
    localStorage.setItem('echeq_sandbox_credentials', JSON.stringify(credentials));
    
    // Actualizar indicador en el header
    updateCredentialsIndicator();
    
    showAlert('Credenciales configuradas! Ahora puedes usar el Swagger con autenticación automática.', 'success');
}

// Función para probar conexión ANTES de configurar credenciales
async function testConnectionFirst() {
    const apiKey = document.getElementById('testApiKey').value;
    const apiSecret = document.getElementById('testApiSecret').value;
    const tenantId = document.getElementById('testTenantId').value;
    
    if (!apiKey || !apiSecret || !tenantId) {
        showAlert('Por favor, completa todos los campos antes de continuar.', 'error');
        return;
    }
    
    // Mostrar sección de resultado
    const testResult = document.getElementById('testResult');
    const testResultContent = document.getElementById('testResultContent');
    testResult.style.display = 'block';
    
    // Mostrar estado de carga
    testResultContent.innerHTML = `
        <div class="alert alert-info">
            <strong>🔄 Probando conexión...</strong><br>
            Validando credenciales contra el servidor...
        </div>
    `;
    
    try {
        // Usar un endpoint INOCUO que solo valide credenciales sin crear datos
        const response = await fetch('/api/coelsa/Cuentas/Cuenta', {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey,
                'X-API-Secret': apiSecret,
                'X-Tenant-ID': tenantId,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // ÉXITO: Mostrar botón para configurar credenciales
            testResultContent.innerHTML = `
                <div class="alert alert-success">
                    <strong>✅ Conexión exitosa!</strong><br>
                    Las credenciales son válidas y el API está funcionando correctamente.
                </div>
                <div style="margin-top: 15px;">
                    <button class="btn btn-primary" onclick="configureCredentialsAfterTest()">Configurar Credenciales</button>
                    <button class="btn btn-secondary" onclick="clearTestResult()">Cancelar</button>
                </div>
            `;
        } else {
            // ERROR: Mostrar error y opciones
            testResultContent.innerHTML = `
                <div class="alert alert-danger">
                    <strong>❌ Error en la conexión</strong><br>
                    ${result.message || 'Credenciales inválidas o error del servidor'}
                </div>
                <div style="margin-top: 15px;">
                    <button class="btn btn-warning" onclick="retryTest()">Reintentar</button>
                    <button class="btn btn-secondary" onclick="clearTestResult()">Cancelar</button>
                </div>
            `;
        }
    } catch (error) {
        // ERROR DE RED: Mostrar error de conexión
        testResultContent.innerHTML = `
            <div class="alert alert-danger">
                <strong>❌ Error de conexión</strong><br>
                ${error.message}
            </div>
            <div style="margin-top: 15px;">
                <button class="btn btn-warning" onclick="retryTest()">Reintentar</button>
                <button class="btn btn-secondary" onclick="clearTestResult()">Cancelar</button>
            </div>
        `;
    }
}

// Función para configurar credenciales DESPUÉS de una prueba exitosa
function configureCredentialsAfterTest() {
    const apiKey = document.getElementById('testApiKey').value;
    const apiSecret = document.getElementById('testApiSecret').value;
    const tenantId = document.getElementById('testTenantId').value;
    
    // Guardar credenciales
    currentCredentials = {
        apiKey: apiKey,
        apiSecret: apiSecret,
        tenantId: tenantId
    };
    
    // Ocultar sección de prueba y mostrar sección configurada
    document.getElementById('testResult').style.display = 'none';
    document.getElementById('swaggerAccess').style.display = 'block';
    
    // Reinicializar Swagger UI con las nuevas credenciales
    initializeSwagger();
    
    // Guardar también en localStorage para persistencia
    const credentials = {
        apiKey: apiKey,
        apiSecret: apiSecret,
        tenantId: tenantId,
        generatedAt: new Date().toISOString()
    };
    localStorage.setItem('echeq_sandbox_credentials', JSON.stringify(credentials));
    
    // Actualizar indicador en el header
    updateCredentialsIndicator();
    
    showToast('Credenciales configuradas exitosamente!', 'success');
}

// Función para limpiar resultado de prueba
function clearTestResult() {
    document.getElementById('testResult').style.display = 'none';
}

// Función para reintentar prueba
function retryTest() {
    clearTestResult();
    testConnectionFirst();
}

// Función para manejar el evento Enter en el campo de contraseña de administrador
function handleAdminKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        loadTenants();
    }
}

// Función para borrar logs (requiere clave de admin)
async function clearLogs() {
    const adminKey = prompt('Ingresa la clave de administrador para borrar los logs:');
    
    if (!adminKey) {
        showAlert('Operación cancelada', 'info');
        return;
    }
    
    // Validar clave de administrador (el backend valida, esto es solo UI)
    // La validación real se hace en el backend
    if (!adminKey) {
        showAlert('Por favor ingresa la clave de administrador', 'error');
        return;
    }
    
    if (!confirm('¿Estás seguro de que quieres borrar todos los logs? Esta acción no se puede deshacer.')) {
        showAlert('Operación cancelada', 'info');
        return;
    }
    
    try {
        showAlert('Borrando logs...', 'info');
        
        const response = await fetch('/api/sandbox/logs/clear', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminKey}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showAlert('Logs borrados exitosamente', 'success');
            // Recargar logs inmediatamente
            setTimeout(() => {
                refreshLogs();
            }, 1000); // Esperar 1 segundo para que se complete el borrado
        } else {
            showAlert('Error al borrar logs: ' + (result.message || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error borrando logs:', error);
        showAlert('Error de conexión al borrar logs: ' + error.message, 'error');
    }
}

// Función para generar datos de prueba
function fillTestData() {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const randomCuit = '20' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    
    document.getElementById('tenantName').value = `Banco Demo ${randomId}`;
    document.getElementById('tenantCode').value = `BANCO_DEMO_${randomId}`;
    document.getElementById('tenantCuit').value = randomCuit;
    document.getElementById('tenantType').value = 'BANCO';
    
    showAlert('Datos de prueba cargados. Puedes modificarlos si lo deseas.', 'info');
    
    // También expandir el tab automáticamente
    skipStep1();
}

// Función para crear tenant
async function createTenant(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const tenantData = {
        name: formData.get('tenantName'),
        code: formData.get('tenantCode'),
        cuit: formData.get('tenantCuit'),
        tipo: formData.get('tenantType')
    };
    
    try {
        // Usar la clave ingresada por el usuario o la del formulario
        const adminPassword = document.getElementById('adminKey')?.value || 'admin1234';
        const response = await fetch(`/api/real/tenants?password=${encodeURIComponent(adminPassword)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tenantData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Llenar el campo tenantId automáticamente
            document.getElementById('tenantId').value = result.data.id;
            
            // Completar paso 2 y mostrar paso 3
            completeStep(2);
            showStep(3);
            updateStepStatus(3, 'current');
            
            showAlert('Tenant creado exitosamente!', 'success');
        } else {
            showAlert('Error creando tenant: ' + result.message, 'error');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// Función para generar API keys
async function generateKeys(event) {
    event.preventDefault();
    
    const tenantId = document.getElementById('tenantId').value;
    
    if (!tenantId) {
        showAlert('Por favor, crea un tenant primero.', 'error');
        return;
    }
    
    try {
        // Usar la clave ingresada por el usuario o la del formulario
        const adminPassword = document.getElementById('adminKey')?.value || 'admin1234';
        const response = await fetch(`/api/real/tenants/${tenantId}/generate-keys?password=${encodeURIComponent(adminPassword)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Mostrar las credenciales generadas
            document.getElementById('apiKey').textContent = result.data.apiKey;
            document.getElementById('apiSecret').textContent = result.data.apiSecret;
            document.getElementById('tenantIdDisplay').textContent = result.data.tenantId;
            
            // Generar variables de entorno
            const envVars = `X_API_KEY=${result.data.apiKey}
X_API_SECRET=${result.data.apiSecret}
X_TENANT_ID=${result.data.tenantId}`;
            document.getElementById('envVars').textContent = envVars;
            
            // Guardar credenciales en localStorage para usar en Testing APIs
            const credentials = {
                apiKey: result.data.apiKey,
                apiSecret: result.data.apiSecret,
                tenantId: result.data.tenantId,
                generatedAt: new Date().toISOString()
            };
            localStorage.setItem('echeq_sandbox_credentials', JSON.stringify(credentials));
            
            // Actualizar indicador en el header
            updateCredentialsIndicator();
            
            // Mostrar la sección de resultados
            document.getElementById('credentials-results').style.display = 'block';
            
            // Completar paso 3
            completeStep(3);
            
            showAlert('API Keys generadas exitosamente!', 'success');
        } else {
            showAlert('Error generando API Keys: ' + result.message, 'error');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// Función para copiar al portapapeles
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        showAlert('Copiado al portapapeles!', 'success');
        
        // Si es Variables de Entorno, también guardar credenciales para detección automática
        if (elementId === 'envVars') {
            // Extraer credenciales del texto de Variables de Entorno
            const lines = text.split('\n');
            let apiKey = '', apiSecret = '', tenantId = '';
            
            lines.forEach(line => {
                if (line.includes('X_API_KEY=')) {
                    apiKey = line.split('X_API_KEY=')[1] || line.split('X_API_KEY=')[1];
                } else if (line.includes('X_API_SECRET=')) {
                    apiSecret = line.split('X_API_SECRET=')[1] || line.split('X_API_SECRET=')[1];
                } else if (line.includes('X_TENANT_ID=')) {
                    tenantId = line.split('X_TENANT_ID=')[1] || line.split('X_TENANT_ID=')[1];
                }
            });
            
            if (apiKey && apiSecret && tenantId) {
                // Guardar credenciales en localStorage para detección automática
                const credentials = {
                    apiKey: apiKey.trim(),
                    apiSecret: apiSecret.trim(),
                    tenantId: tenantId.trim(),
                    timestamp: new Date().toISOString(),
                    source: 'credentials_page'
                };
                
                localStorage.setItem('echeq_credentials', JSON.stringify(credentials));
                console.log('Credenciales guardadas para detección automática:', credentials);
            }
        }
    }).catch(() => {
        showAlert('Error copiando al portapapeles', 'error');
    });
}

// ===== SISTEMA DE TOAST =====

// Función para mostrar toast
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    // Crear elemento toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Iconos para cada tipo
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">${message}</div>
        <button class="toast-close" onclick="removeToast(this.parentElement)">×</button>
        <div class="toast-progress"></div>
    `;
    
    // Agregar al container
    container.appendChild(toast);
    
    // Mostrar con animación
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Auto-remover
    setTimeout(() => {
        removeToast(toast);
    }, duration);
}

// Función para remover toast
function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    
    toast.classList.remove('show');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

// Función para mostrar alertas (mantener compatibilidad)
function showAlert(message, type = 'info') {
    // Usar toast en lugar de alertas tradicionales
    showToast(message, type);
}

// Variables globales para logs
let autoRefreshInterval = null;
let isAutoRefreshEnabled = false;

// Variable para controlar detección de credenciales copiadas
let credentialsDetected = false;

// Función de debouncing para evitar ejecuciones múltiples
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Función para cargar logs
async function refreshLogs() {
    try {
        const response = await fetch('/api/sandbox/logs');
        const data = await response.json();
        
        if (data.success) {
            updateLogsDisplay(data.data.logs);
        } else {
            console.error('Error cargando logs:', data.message);
        }
    } catch (error) {
        console.error('Error cargando logs:', error);
    }
}

// Versión con debouncing de refreshLogs para evitar llamadas múltiples
const debouncedRefreshLogs = debounce(refreshLogs, 500);

// Función para actualizar la visualización de logs
function updateLogsDisplay(logs) {
    const logsContainer = document.getElementById('logs-container');
    if (!logsContainer) return;
    
    if (!logs || logs.length === 0) {
        logsContainer.innerHTML = '<p>No hay logs disponibles</p>';
        return;
    }
    
    const logsHTML = logs.map(log => `
        <div class="log-entry">
            <div class="log-header">
                <span class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</span>
                <span class="log-level log-level-${log.level.toLowerCase()}">${log.level}</span>
            </div>
            <div class="log-message">${log.message}</div>
            ${log.details ? `<div class="log-details">${JSON.stringify(log.details, null, 2)}</div>` : ''}
        </div>
    `).join('');
    
    logsContainer.innerHTML = logsHTML;
}

// Función eliminada - duplicada con la de línea 1690

// Inicializar Swagger UI
function initializeSwagger() {
    const swaggerContainer = document.getElementById('swagger-ui');
    if (!swaggerContainer) {
        console.error('Contenedor swagger-ui no encontrado');
        return;
    }
    
    // Verificar que SwaggerUIBundle esté disponible
    if (typeof SwaggerUIBundle === 'undefined') {
        console.warn('SwaggerUIBundle no está disponible aún, reintentando en 1 segundo...');
        setTimeout(() => initializeSwagger(), 1000);
        return;
    }
    
    // Destruir instancia anterior si existe
    if (window.ui) {
        try {
            window.ui = null;
        } catch (error) {
            console.warn('Error limpiando instancia anterior de Swagger UI:', error);
        }
    }
    
    // Limpiar contenido anterior de forma segura
    try {
        while (swaggerContainer.firstChild) {
            swaggerContainer.removeChild(swaggerContainer.firstChild);
        }
    } catch (error) {
        console.warn('Error limpiando contenedor:', error);
        swaggerContainer.innerHTML = '';
    }
    
    // Agregar mensaje de carga
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = 'text-align: center; padding: 20px; color: #666;';
    loadingDiv.textContent = 'Cargando documentación de la API...';
    swaggerContainer.appendChild(loadingDiv);
    
    try {
        // Configuración simplificada de Swagger UI
        const ui = SwaggerUIBundle({
            url: '/api/coelsa/swagger.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.presets.standalone
            ],
            layout: "BaseLayout",
            // Configuración específica para OpenAPI 3.0
            docExpansion: "none",
            defaultModelsExpandDepth: 0,
            defaultModelExpandDepth: 0,
            defaultModelRendering: "model",
            tryItOutEnabled: true,
            supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
            validatorUrl: null,
            // Configuración para OpenAPI 3.0
            oauth2RedirectUrl: window.location.origin + '/oauth2-redirect.html',
            // Configurar autenticación automática
            requestInterceptor: (request) => {
                // Agregar credenciales automáticamente si están disponibles
                if (currentCredentials && currentCredentials.apiKey) {
                    request.headers['X-API-Key'] = currentCredentials.apiKey;
                    request.headers['X-API-Secret'] = currentCredentials.apiSecret;
                    request.headers['X-Tenant-ID'] = currentCredentials.tenantId;
                    console.log('🔑 Credenciales inyectadas automáticamente:', {
                        'X-API-Key': currentCredentials.apiKey.substring(0, 10) + '...',
                        'X-API-Secret': '***',
                        'X-Tenant-ID': currentCredentials.tenantId
                    });
                } else {
                    console.warn('⚠️ No hay credenciales disponibles para inyectar');
                }
                return request;
            },
            onComplete: () => {
                console.log('✅ Swagger UI cargado exitosamente');
                
                console.log('📖 Swagger UI configurado para mostrar endpoints colapsados');
                
                // Ocultar el botón Authorize después de cargar
                setTimeout(() => {
                    const authorizeBtn = document.querySelector('.auth-btn-wrapper');
                    if (authorizeBtn) {
                        authorizeBtn.style.display = 'none';
                        console.log('🔒 Botón Authorize ocultado');
                    }
                    
                    // También ocultar el ícono de candado
                    const lockIcon = document.querySelector('.auth-wrapper .auth-container .auth-btn');
                    if (lockIcon) {
                        lockIcon.style.display = 'none';
                    }
                }, 1000);
            },
            onFailure: (error) => {
                console.error('❌ Error específico de Swagger UI:', error);
                swaggerContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444;">Error cargando Swagger UI: ' + error.message + '</div>';
            },
            // Configuración adicional para OpenAPI 3.0
            onResponse: (response) => {
                console.log('📡 Respuesta de API recibida:', response);
            },
            // Configuración de plugins
            plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
            ]
        });
        
        window.ui = ui;
    } catch (error) {
        console.error('Error inicializando Swagger UI:', error);
        swaggerContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444;">Error cargando Swagger UI: ' + error.message + '</div>';
    }
}

// Función para probar conexión
async function testConnection() {
    if (!currentCredentials || !currentCredentials.apiKey) {
        showAlert('Por favor, configura las credenciales primero.', 'error');
        return;
    }
    
    try {
        // Usar un endpoint que realmente valide las credenciales COELSA
        const response = await fetch('/api/coelsa/Cheques/Cheque', {
            method: 'POST',
            headers: {
                'X-API-Key': currentCredentials.apiKey,
                'X-API-Secret': currentCredentials.apiSecret,
                'X-Tenant-ID': currentCredentials.tenantId,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "emisor_cuit": "20123456789",
                "emisor_cbu": "1234567890123456789012",
                "beneficiario_documento": "20987654321",
                "beneficiario_nombre": "Test User",
                "monto": 100,
                "fecha_emision": "2025-09-24",
                "fecha_vencimiento": "2025-12-24",
                "concepto": "Test de conexión"
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showAlert('Conexión exitosa! Las credenciales son válidas y el API está funcionando correctamente.', 'success');
        } else {
            showAlert('Error en la conexión: ' + (result.message || 'Credenciales inválidas'), 'error');
        }
    } catch (error) {
        showAlert('Error de conexión: ' + error.message, 'error');
    }
}

// Función para cargar credenciales de un tenant por ID
async function loadTenantCredentialsById() {
    const tenantId = document.getElementById('tenantIdInput').value;
    
    if (!tenantId) {
        showAlert('Por favor, ingresa el ID del tenant.', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/sandbox/tenant-credentials/${tenantId}`);
        const result = await response.json();
        
        if (result.success) {
            displayTenantCredentials(result.data);
        } else {
            showAlert('Error cargando credenciales: ' + result.message, 'error');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// Función para mostrar las credenciales del tenant
function displayTenantCredentials(data) {
    const container = document.getElementById('tenant-credentials-result');
    
    const credentialsHTML = `
        <div class="step-card" style="background: #f8f9fa; border: 1px solid #e9ecef;">
            <div class="step-header">
                <h4>✅ Credenciales Encontradas</h4>
            </div>
            <div class="step-content">
                <div class="credentials-grid">
                    <div class="credential-item">
                        <h4>API Key</h4>
                        <div class="credential-value">
                            <code id="cred-api-key">${data.apiKey}</code>
                            <button class="copy-btn" onclick="copyToClipboard('cred-api-key')">Copiar</button>
                        </div>
                    </div>
                    
                    <div class="credential-item">
                        <h4>API Secret</h4>
                        <div class="credential-value">
                            <code id="cred-api-secret">${data.apiSecret}</code>
                            <button class="copy-btn" onclick="copyToClipboard('cred-api-secret')">Copiar</button>
                        </div>
                    </div>
                    
                    <div class="credential-item">
                        <h4>Tenant ID</h4>
                        <div class="credential-value">
                            <code id="cred-tenant-id">${data.tenantId}</code>
                            <button class="copy-btn" onclick="copyToClipboard('cred-tenant-id')">Copiar</button>
                        </div>
                    </div>
                </div>
                
                <div class="terminal-commands" style="margin-top: 1rem;">
                    <h4>Variables de Entorno</h4>
                    <div class="credential-value">
                        <pre id="cred-env-vars">X_API_KEY=${data.apiKey}
X_API_SECRET=${data.apiSecret}
X_TENANT_ID=${data.tenantId}</pre>
                        <button class="copy-btn" onclick="copyToClipboard('cred-env-vars')">Copiar</button>
                    </div>
                </div>
                
                <div style="margin-top: 1rem; text-align: center;">
                    <button class="btn btn-primary" onclick="useTheseCredentials('${data.apiKey}', '${data.apiSecret}', '${data.tenantId}')">
                        🚀 Usar Estas Credenciales
                    </button>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = credentialsHTML;
    container.style.display = 'block';
    
    showToast('Credenciales cargadas exitosamente', 'success');
}

// Función para usar las credenciales encontradas
function useTheseCredentials(apiKey, apiSecret, tenantId) {
    // Guardar en localStorage para uso en API Testing
    const credentials = {
        apiKey: apiKey,
        apiSecret: apiSecret,
        tenantId: tenantId,
        generatedAt: new Date().toISOString()
    };
    localStorage.setItem('echeq_sandbox_credentials', JSON.stringify(credentials));
    
    // Actualizar indicador en el header
    updateCredentialsIndicator();
    
    showToast('Credenciales guardadas. Ve a "API Testing & Documentation" para usarlas.', 'success', 5000);
}

// Función para mostrar la lista de tenants
function displayTenantsList(tenants) {
    const container = document.getElementById('tenants-list');
    if (!container) return;
    
    if (!tenants || tenants.length === 0) {
        container.innerHTML = '<p>No hay tenants disponibles</p>';
        container.style.display = 'block';
        return;
    }
    
    const tenantsHTML = tenants.map(tenant => `
        <div class="tenant-item" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 0.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${tenant.nombre}</strong> (${tenant.codigo})
                    <br>
                    <small style="color: #64748b;">CUIT: ${tenant.cuit} | Tipo: ${tenant.tipo}</small>
                </div>
                <button onclick="loadTenantCredentials('${tenant.id}')" class="btn btn-info" style="padding: 0.5rem 1rem; font-size: 0.8rem;">
                    Cargar Credenciales
                </button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = tenantsHTML;
    container.style.display = 'block';
}

// Función para cargar credenciales de un tenant
async function loadTenantCredentials(tenantId) {
    try {
        const response = await fetch(`/api/sandbox/tenant-credentials/${tenantId}`);
        const result = await response.json();
        
        if (result.success) {
            // Llenar los campos automáticamente
            document.getElementById('tenantId').value = tenantId;
            
            // Mostrar las credenciales
            document.getElementById('apiKey').textContent = result.data.sandbox_credentials.api_key;
            document.getElementById('apiSecret').textContent = result.data.sandbox_credentials.api_secret;
            document.getElementById('tenantIdDisplay').textContent = result.data.tenant_id;
            
            // Generar variables de entorno
            const envVars = `X_API_KEY=${result.data.sandbox_credentials.api_key}
X_API_SECRET=${result.data.sandbox_credentials.api_secret}
X_TENANT_ID=${result.data.tenant_id}`;
            document.getElementById('envVars').textContent = envVars;
            
            // Mostrar la sección de resultados
            document.getElementById('credentials-results').style.display = 'block';
            
            showAlert('Credenciales cargadas exitosamente', 'success');
        } else {
            showAlert('Error cargando credenciales: ' + result.message, 'error');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// Función para cargar credenciales guardadas y ajustar la interfaz
function loadStoredCredentials() {
    const storedCredentials = localStorage.getItem('echeq_sandbox_credentials');
    
    if (storedCredentials) {
        try {
            const credentials = JSON.parse(storedCredentials);
            
            // Llenar los campos con las credenciales guardadas
            const apiKeyField = document.getElementById('testApiKey');
            const apiSecretField = document.getElementById('testApiSecret');
            const tenantIdField = document.getElementById('testTenantId');
            const swaggerAccessSection = document.getElementById('swaggerAccess');
            
            if (apiKeyField && apiSecretField && tenantIdField) {
                apiKeyField.value = credentials.apiKey || '';
                apiSecretField.value = credentials.apiSecret || '';
                tenantIdField.value = credentials.tenantId || '';
                
                // Mostrar solo la sección de credenciales configuradas
                if (swaggerAccessSection) {
                    swaggerAccessSection.style.display = 'block';
                }
                
                // Ocultar la sección de entrada de credenciales
                const credentialsForm = document.getElementById('testCredentialsForm');
                if (credentialsForm && credentialsForm.parentElement) {
                    credentialsForm.parentElement.style.display = 'none';
                }
            }
            
            // Actualizar currentCredentials
            currentCredentials = {
                apiKey: credentials.apiKey,
                apiSecret: credentials.apiSecret,
                tenantId: credentials.tenantId
            };
            
            console.log('Credenciales cargadas desde localStorage');
        } catch (error) {
            console.error('Error cargando credenciales desde localStorage:', error);
        }
    } else {
        // Si no hay credenciales guardadas, asegurar que se muestre la sección de entrada
        const swaggerAccessSection = document.getElementById('swaggerAccess');
        const credentialsForm = document.getElementById('testCredentialsForm');
        
        if (swaggerAccessSection) {
            swaggerAccessSection.style.display = 'none';
        }
        if (credentialsForm && credentialsForm.parentElement) {
            credentialsForm.parentElement.style.display = 'block';
        }
    }
}

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('Panel de administración cargado');
    
    // Inicializar el indicador de credenciales
    updateCredentialsIndicator();
    
    // Cargar credenciales guardadas y ajustar interfaz
    loadStoredCredentials();
    
    // Inicializar el primer tab por defecto
    showTab('data');
    
    // Configurar event listeners para formularios
    const createTenantForm = document.getElementById('createTenantForm');
    if (createTenantForm) {
        createTenantForm.addEventListener('submit', createTenant);
    }
    
    const generateKeysForm = document.getElementById('generateKeysForm');
    if (generateKeysForm) {
        generateKeysForm.addEventListener('submit', generateKeys);
    }
    
    // Inicializar auto-refresh de logs si está habilitado
    if (isAutoRefreshEnabled) {
        autoRefreshInterval = setInterval(refreshLogs, 5000);
    }
    
    // Detectar credenciales copiadas al cargar la página
    detectarCredencialesCopiadas();
});

// ===== FUNCIONALIDAD DE COPIA/PEGADO =====

// Función para copiar todas las credenciales al localStorage
function copiarCredencialesCompletas() {
    const modalTenantId = document.getElementById('modalTenantId');
    const modalTenantApiKey = document.getElementById('modalTenantApiKey');
    const modalTenantApiSecret = document.getElementById('modalTenantApiSecret');
    
    if (!modalTenantId || !modalTenantApiKey || !modalTenantApiSecret) {
        showToast('Error: No se pudieron obtener las credenciales', 'error');
        return;
    }
    
    const credentials = {
        apiKey: modalTenantApiKey.textContent,
        apiSecret: modalTenantApiSecret.textContent,
        tenantId: modalTenantId.textContent,
        timestamp: new Date().toISOString(),
        source: 'tenant_details'
    };
    
    // Guardar en localStorage
    localStorage.setItem('echeq_credentials', JSON.stringify(credentials));
    
    // Mostrar confirmación
    showToast('✅ Credenciales copiadas. Navega a "API Testing & Documentation" para pegarlas automáticamente.', 'success', 5000);
    
    console.log('Credenciales guardadas:', credentials);
}

// Función para detectar credenciales copiadas al cargar la página
function detectarCredencialesCopiadas() {
    // Evitar ejecuciones múltiples
    if (credentialsDetected) {
        return;
    }
    
    const savedCredentials = localStorage.getItem('echeq_credentials');
    
    if (savedCredentials) {
        try {
            const credentials = JSON.parse(savedCredentials);
            
            // Verificar que no sean muy antiguas (máximo 1 hora)
            const now = new Date();
            const savedTime = new Date(credentials.timestamp);
            const diffHours = (now - savedTime) / (1000 * 60 * 60);
            
            if (diffHours > 1) {
                // Limpiar credenciales antiguas
                localStorage.removeItem('echeq_credentials');
                return;
            }
            
            // Marcar como detectado para evitar múltiples ejecuciones
            credentialsDetected = true;
            
            // Mostrar diálogo de confirmación
            mostrarDialogoPegado(credentials);
            
        } catch (error) {
            console.error('Error al parsear credenciales guardadas:', error);
            localStorage.removeItem('echeq_credentials');
        }
    }
}

// Función para mostrar diálogo de confirmación
function mostrarDialogoPegado(credentials) {
    const confirmar = confirm(
        `📋 ¿Desea pegar las credenciales copiadas?\n\n` +
        `🔑 API Key: ${credentials.apiKey.substring(0, 25)}...\n` +
        `🔐 API Secret: ${credentials.apiSecret.substring(0, 25)}...\n` +
        `🏢 Tenant ID: ${credentials.tenantId}\n\n` +
        `Estas credenciales se llenarán automáticamente en los campos correspondientes.`
    );
    
    if (confirmar) {
        llenarCamposAutomaticamente(credentials);
        // Limpiar localStorage después de usar
        localStorage.removeItem('echeq_credentials');
        showToast('✅ Credenciales pegadas exitosamente', 'success');
    } else {
        // Limpiar localStorage si el usuario cancela
        localStorage.removeItem('echeq_credentials');
    }
}

// Función para llenar campos automáticamente
function llenarCamposAutomaticamente(credentials) {
    // Buscar campos en la sección de API Testing & Documentation
    const apiKeyField = document.getElementById('testApiKey');
    const apiSecretField = document.getElementById('testApiSecret');
    const tenantIdField = document.getElementById('testTenantId');
    
    if (apiKeyField) {
        apiKeyField.value = credentials.apiKey;
        apiKeyField.style.backgroundColor = '#d4edda'; // Verde claro para indicar que fue llenado automáticamente
    }
    
    if (apiSecretField) {
        apiSecretField.value = credentials.apiSecret;
        apiSecretField.style.backgroundColor = '#d4edda';
    }
    
    if (tenantIdField) {
        tenantIdField.value = credentials.tenantId;
        tenantIdField.style.backgroundColor = '#d4edda';
    }
    
    // Restaurar color original después de 3 segundos
    setTimeout(() => {
        [apiKeyField, apiSecretField, tenantIdField].forEach(field => {
            if (field) {
                field.style.backgroundColor = '';
            }
        });
    }, 3000);
    
    console.log('Campos llenados automáticamente:', credentials);
}

// ===== FUNCIONALIDAD DE LOGS =====

// Variables para el sistema de logs (ya declaradas arriba)
// let isAutoRefreshEnabled = false; // Ya declarada arriba
// let autoRefreshInterval = null; // Ya declarada arriba


// Función para actualizar la visualización de logs
function updateLogsDisplay(logs) {
    const logsContainer = document.getElementById('logsContainer');
    if (!logsContainer) return;
    
    if (logs.length === 0) {
        logsContainer.innerHTML = '<p style="text-align: center; color: #666;">No hay logs disponibles</p>';
        return;
    }
    
    const logsHtml = logs.map(log => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const level = log.level || 'info';
        const levelColor = {
            'error': '#dc3545',
            'warn': '#ffc107',
            'info': '#17a2b8',
            'debug': '#6c757d'
        }[level] || '#17a2b8';
        
        return `
            <div class="log-entry" style="
                border-left: 3px solid ${levelColor};
                padding: 8px 12px;
                margin: 4px 0;
                background: #f8f9fa;
                font-family: monospace;
                font-size: 0.9em;
            ">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: ${levelColor}; font-weight: bold;">[${level.toUpperCase()}]</span>
                    <span style="color: #6c757d; font-size: 0.8em;">${timestamp}</span>
                </div>
                <div>${log.message}</div>
                ${log.source ? `<div style="color: #6c757d; font-size: 0.8em;">Source: ${log.source}</div>` : ''}
            </div>
        `;
    }).join('');
    
    logsContainer.innerHTML = logsHtml;
}

// Función para alternar el auto-refresh de logs
function toggleAutoRefresh() {
    // Limpiar cualquier intervalo existente antes de cambiar el estado
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
    
    isAutoRefreshEnabled = !isAutoRefreshEnabled;
    
    if (isAutoRefreshEnabled) {
        // Activar auto-refresh
        autoRefreshInterval = setInterval(refreshLogs, 5000);
        showToast('Auto-refresh activado (cada 5 segundos)', 'success');
        
        // Refrescar inmediatamente
        refreshLogs();
    } else {
        // Desactivar auto-refresh
        showToast('Auto-refresh desactivado', 'info');
    }
    
    // Actualizar el texto del botón
    const toggleBtn = document.querySelector('button[onclick="toggleAutoRefresh()"]');
    if (toggleBtn) {
        toggleBtn.textContent = isAutoRefreshEnabled ? 'Detener Auto-refresh' : 'Activar Auto-refresh';
    }
}
