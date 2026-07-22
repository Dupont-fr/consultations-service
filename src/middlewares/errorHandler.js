const errorHandler = (err, req, res, next) => {
  console.error('❌ Erreur:', err.message)

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Le patient sélectionné n\'existe pas',
    })
  }

  if (err.code === '23502') {
    return res.status(400).json({
      success: false,
      message: 'Un champ obligatoire est manquant',
    })
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur',
  })
}

module.exports = errorHandler
